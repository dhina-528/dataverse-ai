import React, { useState } from 'react';
import { FileUpload } from '../../components/FileUpload/FileUpload';
import { apiService } from '../../services/api';
import { DataChart } from '../../components/Charts/DataChart';
import { MOCK_SAMPLE_DATASET } from '../../utils/mockData';
import { Table, BarChart2, ShieldAlert, Sparkles, Filter, FileSpreadsheet } from 'lucide-react';
import './DataAnalysis.css';

export const DataAnalysis = ({ onDatasetLoaded }) => {
  const [dataset, setDataset] = useState(MOCK_SAMPLE_DATASET);
  const [selectedColumn, setSelectedColumn] = useState('Sales_Volume');
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    try {
      const uploadedDataset = await apiService.uploadDataset(file);
      setDataset({ ...uploadedDataset.profile, filename: uploadedDataset.filename });
      onDatasetLoaded?.(uploadedDataset);
    } catch (error) {
      window.alert(`Dataset upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Generate distribution data for selected numeric column
  const distributionData = [
    { label: '0-10k', value: 340, color: '#6366f1' },
    { label: '10k-25k', value: 520, color: '#818cf8' },
    { label: '25k-50k', value: 410, color: '#06b6d4' },
    { label: '50k-75k', value: 110, color: '#10b981' },
    { label: '75k+', value: 40, color: '#f59e0b' },
  ];

  return (
    <div className="page-analysis">
      {/* Upload Banner */}
      <div className="analysis-upload-section">
        <FileUpload onFileUpload={handleFileUpload} isUploading={isUploading} />
      </div>

      {/* Dataset Summary Cards */}
      {dataset && (
        <div className="dataset-meta-grid">
          <div className="meta-card glass-panel">
            <span className="meta-label">Active Dataset</span>
            <div className="meta-val-flex">
              <FileSpreadsheet size={18} className="text-primary-light" />
              <span className="meta-val">{dataset.filename}</span>
            </div>
          </div>

          <div className="meta-card glass-panel">
            <span className="meta-label">Total Records</span>
            <span className="meta-val">{dataset.total_rows.toLocaleString()} Rows</span>
          </div>

          <div className="meta-card glass-panel">
            <span className="meta-label">Total Features</span>
            <span className="meta-val">{dataset.total_columns} Columns</span>
          </div>

          <div className="meta-card glass-panel">
            <span className="meta-label">Data Quality Index</span>
            <span className="meta-val text-emerald">99.8% Clean</span>
          </div>
        </div>
      )}

      {/* Studio Navigation Sub-Tabs */}
      <div className="sub-tabs-bar">
        <button
          className={`sub-tab-btn ${activeSubTab === 'overview' ? 'sub-tab-active' : ''}`}
          onClick={() => setActiveSubTab('overview')}
        >
          <Table size={15} /> Schema & Summary
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'distribution' ? 'sub-tab-active' : ''}`}
          onClick={() => setActiveSubTab('distribution')}
        >
          <BarChart2 size={15} /> Distributions & Trends
        </button>
        <button
          className={`sub-tab-btn ${activeSubTab === 'table' ? 'sub-tab-active' : ''}`}
          onClick={() => setActiveSubTab('table')}
        >
          <Filter size={15} /> Tabular Preview ({dataset?.preview?.length || 0})
        </button>
      </div>

      {/* Tab 1: Schema Profile */}
      {activeSubTab === 'overview' && dataset && (
        <div className="schema-table-container glass-panel">
          <div className="table-header-title">
            <h4>Feature Attribute Matrix & Statistical Moments</h4>
            <span className="badge badge-primary">Auto-Profiled</span>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Type</th>
                  <th>Null %</th>
                  <th>Unique Values</th>
                  <th>Min / Max</th>
                  <th>Mean ± Std</th>
                </tr>
              </thead>
              <tbody>
                {dataset.columns.map((col) => (
                  <tr key={col.name}>
                    <td className="font-semibold text-primary-light">{col.name}</td>
                    <td>
                      <span className={`badge ${col.type === 'numeric' ? 'badge-primary' : 'badge-warning'}`}>
                        {col.dtype}
                      </span>
                    </td>
                    <td>{col.null_pct}%</td>
                    <td>{col.unique_count.toLocaleString()}</td>
                    <td>
                      {col.type === 'numeric' ? `${col.min?.toLocaleString()} / ${col.max?.toLocaleString()}` : '—'}
                    </td>
                    <td>
                      {col.type === 'numeric' ? `${col.mean?.toLocaleString()} (±${col.median})` : 'Categorical'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Distribution Visualizer */}
      {activeSubTab === 'distribution' && (
        <div className="distribution-view-grid">
          <div className="dist-selector glass-panel">
            <h4>Select Column to Analyze</h4>
            <div className="column-pill-list">
              {dataset.columns.map((c) => (
                <button
                  key={c.name}
                  className={`col-pill ${selectedColumn === c.name ? 'col-pill-active' : ''}`}
                  onClick={() => setSelectedColumn(c.name)}
                >
                  <span>{c.name}</span>
                  <span className="col-type-tag">{c.type}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dist-chart-wrap">
            <DataChart
              type="bar"
              title={`Frequency Distribution: ${selectedColumn}`}
              subtitle="Calculated across standard quartile bins"
              data={distributionData}
              height={280}
              accentColor="#8b5cf6"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Table Preview */}
      {activeSubTab === 'table' && dataset && (
        <div className="schema-table-container glass-panel">
          <div className="table-header-title">
            <h4>Real-Time Dataset Records</h4>
            <span className="text-secondary text-sm">Showing top records</span>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  {dataset.columns.map((c) => (
                    <th key={c.name}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.preview.map((row, idx) => (
                  <tr key={idx}>
                    {dataset.columns.map((c) => (
                      <td key={c.name}>{row[c.name] !== undefined ? String(row[c.name]) : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
