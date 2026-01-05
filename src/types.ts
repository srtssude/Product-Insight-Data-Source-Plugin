import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export type MetricType = 'mrr' | 'dau' | 'churn' | 'orders';

export interface MyQuery extends DataQuery {
  metricType?: MetricType;

  enableForecasting?: boolean;
  forecastHorizon?: number; 

  anomalyThreshold?: number; 
  generateInsights?: boolean; 
}

export interface MyDataSourceOptions extends DataSourceJsonData {
  apiUrl?: string;          
  apiKey?: string;
  simulateLatency?: boolean;
}
