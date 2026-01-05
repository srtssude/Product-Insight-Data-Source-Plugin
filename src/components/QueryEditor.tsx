import React from 'react';
import { InlineField, Select, InlineSwitch, Input, Slider } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery, MetricType } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const set = (patch: Partial<MyQuery>) => {
    onChange({ ...query, ...patch });
    onRunQuery();
  };

  const metricOptions = [
    { label: 'Monthly Recurring Revenue (MRR)', value: 'mrr' },
    { label: 'Daily Active Users (DAU)', value: 'dau' },
    { label: 'Total Order Volume', value: 'orders' },
    { label: 'Customer Churn Rate (%)', value: 'churn' },
  ];

  const forecastingOn = query.enableForecasting ?? false;
  const horizon = query.forecastHorizon ?? 6;

  return (
    <div className="gf-form-group">
      <div className="gf-form">
        <InlineField label="Select Metric" labelWidth={16}>
          <Select
            options={metricOptions}
            value={(query.metricType ?? 'mrr') as MetricType}
            onChange={(v) => set({ metricType: v.value as MetricType })}
            width={40}
          />
        </InlineField>
      </div>

      <div style={{ marginTop: 12, borderTop: '1px solid #444', paddingTop: 10 }}>
        <p style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
          Registered Developer: <strong>Zeynep Sude Saritas</strong> (Boğaziçi MIS)
        </p>
      </div>

      <div className="gf-form">
        <InlineField
          label="Predictive Analytics"
          labelWidth={24}
          tooltip="Linear regression forecast"
        >
          <InlineSwitch
            value={forecastingOn}
            onChange={(e) => set({ enableForecasting: e.currentTarget.checked })}
          />
        </InlineField>

        {forecastingOn && (
          <>
            <InlineField
              label="Forecast Horizon"
              labelWidth={24}
              tooltip="How many future points to append (0–24)"
            >
              <div style={{ width: 260 }}>
              <Slider
                inputId={`forecast-horizon-${query.refId ?? 'A'}`}
                min={0}
                max={24}
                step={1}
                value={horizon}
                onChange={(v) => set({ forecastHorizon: v })}
              />
              </div>
            </InlineField>

            <div style={{ fontSize: 11, marginLeft: 10, alignSelf: 'center', opacity: 0.8 }}>
              {horizon} pts ● AI Engine Active
            </div>
          </>
        )}
      </div>

      <div className="gf-form">
        <InlineField
          label="Anomaly Threshold"
          labelWidth={24}
          tooltip="Optional override (MRR default 48000, churn default 4)"
        >
          <Input
            type="number"
            width={12}
            value={query.anomalyThreshold ?? ''}
            placeholder="(optional)"
            onChange={(e) => {
              const v = e.currentTarget.value;
              set({ anomalyThreshold: v === '' ? undefined : Number(v) });
            }}
          />
        </InlineField>
      </div>

      <div className="gf-form">
        <InlineField
          label="Generate AI Insights"
          labelWidth={24}
          tooltip="Adds an extra table frame with insights"
        >
          <InlineSwitch
            value={query.generateInsights ?? false}
            onChange={(e) => set({ generateInsights: e.currentTarget.checked })}
          />
        </InlineField>
      </div>
    </div>
  );
}
