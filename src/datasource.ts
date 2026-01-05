import {
  DataSourceInstanceSettings,
  DataQueryRequest,
  DataQueryResponse,
  MutableDataFrame,
  FieldType,
  DataSourceApi,
  dateTime,
} from '@grafana/data';

import { MyDataSourceOptions, MyQuery, MetricType } from './types';

type Notice = { severity: 'info' | 'warning' | 'error'; text: string };
type Point = { time: number; value: number };

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  private apiUrl: string;
  private apiKey: string;
  private simulateLatency: boolean;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);

    this.apiUrl = instanceSettings.jsonData.apiUrl ?? 'http://127.0.0.1:5001/api/metrics';
    this.apiKey = instanceSettings.jsonData.apiKey ?? '';
    this.simulateLatency = instanceSettings.jsonData.simulateLatency ?? false;
  }

  getDefaultQuery(): Partial<MyQuery> {
    return {
      metricType: 'mrr',
      enableForecasting: false,
      forecastHorizon: 6,
      anomalyThreshold: undefined,
      generateInsights: false,
    };
  }

  private getApiUrl(): string {
    return this.apiUrl;
  }

  private getAuthHeaders(): Record<string, string> {
  const key = (this.apiKey ?? '').trim();
  if (!key) {
    return {};
  }

  return {
    Authorization: key,
    'X-API-Key': key,
  };
}


  private async sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  private async maybeDelay() {
    if (!this.simulateLatency) return;
    const ms = 300 + Math.floor(Math.random() * 900);
    await this.sleep(ms);
  }

  private defaultThreshold(metric: MetricType): number | undefined {
    if (metric === 'mrr') return 48000;
    if (metric === 'churn') return 4;
    return undefined;
  }

  private anomalyValue(metric: MetricType, value: number, threshold?: number): number | null {
    if (threshold === undefined) return null;
    if (metric === 'mrr') return value < threshold ? 1 : null;
    if (metric === 'churn') return value > threshold ? 1 : null;
    return null;
  }

  private linearRegression(values: number[]) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private makePointsFromRemote(remoteData: any[], metric: MetricType, from: number, to: number): Point[] {
    const n = remoteData.length;
    if (!n) return [];

    const pts: Point[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? from : from + (i / (n - 1)) * (to - from);
      const v = Number(remoteData[i][metric]);
      if (Number.isFinite(v)) pts.push({ time: t, value: v });
    }
    return pts;
  }

  private runSimulation(metric: MetricType, from: number, to: number, count = 80): Point[] {
    const pts: Point[] = [];
    const step = (to - from) / Math.max(1, count - 1);

    let base = 50000;
    if (metric === 'dau') base = 12000;
    if (metric === 'churn') base = 2.5;
    if (metric === 'orders') base = 900;

    for (let i = 0; i < count; i++) {
      const t = from + i * step;
      const trend = (i / count) * (base * 0.12);
      const noise = (Math.random() - 0.5) * (base * 0.06);
      pts.push({ time: t, value: base + trend + noise });
    }
    return pts;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const range = options.range ?? { from: dateTime().subtract(1, 'hour'), to: dateTime() };
    const from = range.from.valueOf();
    const to = range.to.valueOf();

    const apiUrl = this.getApiUrl();
    const headers = this.getAuthHeaders();

    let remoteData: any[] = [];
    let notice: Notice | undefined;

    try {
      await this.maybeDelay();
      const res = await fetch(apiUrl, { headers });

      if (res.status === 401) {
        notice = { severity: 'error', text: 'Unauthorized (401). Check API Key in datasource settings.' };
      } else if (!res.ok) {
        notice = { severity: 'error', text: `Backend error: ${res.status} ${res.statusText}` };
      } else {
        const json = await res.json();
        remoteData = json.data ?? [];
      }
    } catch (e) {
      notice = { severity: 'warning', text: 'Backend unreachable. Running in Simulation Mode.' };
    }

    const frames: MutableDataFrame[] = [];

    const targets: MyQuery[] =
      options.targets && options.targets.length > 0
        ? options.targets
        : ([{ refId: 'A', metricType: 'mrr' }] as unknown as MyQuery[]);

    for (const target of targets) {
      const refId = target.refId ?? 'A';
      const metric = (target.metricType ?? 'mrr') as MetricType;

      const showForecast = target.enableForecasting ?? false;
      const horizon = Math.max(0, Math.min(24, target.forecastHorizon ?? 6));
      const threshold = target.anomalyThreshold ?? this.defaultThreshold(metric);

      let points = this.makePointsFromRemote(remoteData, metric, from, to);
      const usingRemote = points.length > 0 && notice?.severity !== 'warning';

      if (points.length === 0) {
        points = this.runSimulation(metric, from, to, 80);
      }

      const actualFrame = new MutableDataFrame({
        refId,
        name: `(${metric.toUpperCase()})`,
        fields: [
          { name: 'Time', type: FieldType.time },
          { name: 'Actual', type: FieldType.number },
          { name: 'Growth Index', type: FieldType.number },
          { name: 'Anomaly Score', type: FieldType.number },
        ],
      });

      const metaNotices = notice
        ? [notice]
        : !usingRemote
          ? [{ severity: 'info' as const, text: 'Simulation Mode active.' }]
          : [{ severity: 'info' as const, text: `Connected to backend: ${apiUrl}` }];

      actualFrame.meta = { notices: metaNotices };

      const base = points[0]?.value || 1;
      const actualValues = points.map((p) => p.value);
      const { slope, intercept } = this.linearRegression(actualValues);

      const stepMs =
        points.length >= 2
          ? Math.max(1, points[points.length - 1].time - points[points.length - 2].time)
          : Math.max(1, (to - from) / 10);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const liveValue = p.value + (Math.random() - 0.5) * (p.value * 0.01);
        const growthIndex = (liveValue / base) * 100;
        const anomaly = this.anomalyValue(metric, liveValue, threshold);

        actualFrame.add({
          Time: p.time,
          Actual: liveValue,
          'Growth Index': growthIndex,
          'Anomaly Score': anomaly,
        });
      }

      frames.push(actualFrame);

      if (showForecast) {
        const forecastFrame = new MutableDataFrame({
          refId: `${refId}_forecast`,
          name: `AI Forecast (${metric.toUpperCase()})`,
          fields: [
            { name: 'Time', type: FieldType.time },
            { name: 'AI Forecast', type: FieldType.number },
          ],
        });

        forecastFrame.meta = { notices: metaNotices };

        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          forecastFrame.add({
            Time: p.time,
            'AI Forecast': intercept + slope * i,
          });
        }

        if (horizon > 0) {
          const lastTime = points[points.length - 1].time;
          const startIndex = points.length;

          for (let j = 1; j <= horizon; j++) {
            const t = lastTime + j * stepMs;
            const f = intercept + slope * (startIndex + j - 1);
            forecastFrame.add({
              Time: t,
              'AI Forecast': f,
            });
          }
        }

        frames.push(forecastFrame);
      }

      if (target.generateInsights) {
        const first = actualValues[0] ?? 0;
        const last = actualValues[actualValues.length - 1] ?? 0;
        const pct = first === 0 ? 0 : ((last - first) / first) * 100;

        const anomalyCount =
          actualFrame.fields
            .find((f) => f.name === 'Anomaly Score')
            ?.values.toArray()
            .filter((v) => v === 1).length ?? 0;

        const insightFrame = new MutableDataFrame({
          refId: `${refId}_insights`,
          name: 'AI Insights',
          fields: [
            { name: 'Metric', type: FieldType.string },
            { name: 'Insight', type: FieldType.string },
            { name: 'Recommendation', type: FieldType.string },
          ],
        });

        insightFrame.meta = { notices: metaNotices };

        insightFrame.add({
          Metric: metric.toUpperCase(),
          Insight: `Change over range: ${pct.toFixed(1)}% | anomalies: ${anomalyCount} | threshold: ${threshold ?? 'N/A'}`,
          Recommendation:
            anomalyCount > 0
              ? 'Investigate anomaly windows (pricing, outages, acquisition channel changes).'
              : 'No critical anomalies detected. Keep monitoring and iterate growth experiments.',
        });

        frames.push(insightFrame);
      }
    }

    return { data: frames };
  }

  async testDatasource() {
    const apiUrl = this.getApiUrl();
    const headers = this.getAuthHeaders();

    try {
      const u = new URL(apiUrl);
      u.pathname = '/api/health';
      u.search = '';
      const h = await fetch(u.toString());
      if (!h.ok) {
        return { status: 'error', message: `Health check failed: ${h.status} ${h.statusText}` };
      }
    } catch (e) {
      return { status: 'warning', message: 'Backend unreachable. Plugin will run in Simulation Mode.' };
    }

    try {
      const m = await fetch(apiUrl, { headers });

      if (m.status === 401) {
        return { status: 'error', message: 'Unauthorized (401). Please set correct API Key.' };
      }

      if (m.ok) {
        return { status: 'success', message: `Success: Connected to ${apiUrl}` };
      }

      return { status: 'error', message: `Metrics error: ${m.status} ${m.statusText}` };
    } catch (e) {
      return { status: 'warning', message: 'Metrics call failed. Simulation Mode.' };
    }
  }
}
