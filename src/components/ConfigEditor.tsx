import React, { ChangeEvent } from 'react';
import { InlineField, Input, InlineSwitch, Alert } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

export function ConfigEditor({ onOptionsChange, options }: Props) {
  const { jsonData } = options;

  const onApiUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
  const jsonData = { ...options.jsonData, apiUrl: event.target.value };
  onOptionsChange({ ...options, jsonData });
};

  const onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, apiKey: event.target.value },
    });
  };

  const onLatencyChange = (event: React.SyntheticEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: { ...jsonData, simulateLatency: event.currentTarget.checked },
    });
  };

  return (
    <div className="gf-form-group">
      <Alert title="Developer Info" severity="info">
        ProductInsight Datasource <br />
        Registered Developer: <strong>Zeynep Sude Saritas (2022502006)</strong>
      </Alert>

      <h3 className="page-heading">Connection Settings</h3>

      <div className="gf-form">
        <InlineField label="API Endpoint" labelWidth={20}>
      <Input
        width={50}
        placeholder="http://127.0.0.1:5001/api/metrics"
        value={jsonData.apiUrl ?? 'http://127.0.0.1:5001/api/metrics'}
            onChange={onApiUrlChange}
      />
    </InlineField>
          </div>

      <div className="gf-form">
        <InlineField label="API Key" labelWidth={20} tooltip="Sent as Authorization header">
          <Input
            width={40}
            value={jsonData.apiKey || ''}
            onChange={onAPIKeyChange}
            placeholder="sk-prod-8821-xxxx-xxxx"
            type="password"
          />
        </InlineField>
      </div>

      <h3 className="page-heading">Debug & Simulation</h3>
      <div className="gf-form">
        <InlineField label="Simulate Network Latency" labelWidth={20} tooltip="Adds artificial delay">
          <InlineSwitch value={jsonData.simulateLatency || false} onChange={onLatencyChange} />
        </InlineField>
      </div>
    </div>
  );
}
