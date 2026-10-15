import React, { useState, useEffect } from 'react';
import { FileUpload } from '../../components/FileUpload/FileUpload';
import { apiService } from '../../services/api';
import { DataChart } from '../../components/Charts/DataChart';
import { MOCK_SAMPLE_DATASET } from '../../utils/mockData';
import {
  Table,
  BarChart2,
  ShieldAlert,
  Sparkles,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Check,
  ChevronDown,
  Layers
} from 'lucide-react';
import './DataAnalysis.css';

export const DataAnalysis = ({
  activeDataset,
  datasets = [],
  onSelectDataset,
  onDatasetLoaded
}) => {
  const [dataset, setDataset] = useState(activeDataset?.profile ? { ...activeDataset.profile, filename: activeDataset.filename, dataset_id: activeDataset.dataset_id } : MOCK_SAMPLE_DATASET);
  const [selectedColumn, setSelectedColumn] = useState('Sales_Volume');
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Distribution dynamic state
  const [distributionData, setDistributionData] = useState([]);
  const [loadingDistribution, setLoadingDistribution] = useState(false);

  // Data Quality & Cleaning state
  const [selectedOps, setSelectedOps] = useState([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningResult, setCleaningResult] = useState(null);

  // Sync when activeDataset prop changes
  useEffect(() => {
    if (activeDataset?.profile) {
      setDataset({
        ...activeDataset.profile,
        filename: activeDataset.filename,
        dataset_id: activeDataset.dataset_id
      });
      if (activeDataset.profile.columns?.length > 0) {
        setSelectedColumn(activeDataset.profile.columns[0].name);
      }
    }
  }, [activeDataset]);

  // Set default selected column when columns change
  useEffect(() => {
    if (dataset?.columns?.length > 0 && !dataset.columns.find(c => c.name === selectedColumn)) {
      setSelectedColumn(dataset.columns[0].name);
    }
  }, [dataset]);

  // Fetch real column distribution from backend
  useEffect(() => {
    if (!dataset?.dataset_id || !selectedColumn) {
      // Fallback distribution for mock
      setDistributionData([
        { label: '0-10k', value: 340, color: '#8B72FF' },
        { label: '10k-25k', value: 520, color: '#22D3EE' },
        { label: '25k-50k', value: 410, color: '#2DD4BF' },
        { label: '50k-75k', value: 110, color: '#FBBF24' },
        { label: '75k+', value: 40, color: '#F472B6' },
      ]);
      return;
    }

    let isMounted = true;
    setLoadingDistribution(true);

    apiService.getDistribution(dataset.dataset_id, selectedColumn)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.labels && res.values) {
          const strictColors = ['#8B72FF', '#22D3EE', '#2DD4BF', '#FBBF24', '#F472B6', '#60A5FA'];
          const formatted = res.labels.map((lbl, idx) => ({
            label: String(lbl),
            value: res.values[idx] || 0,
            color: strictColors[idx % strictColors.length]
          }));
          setDistributionData(formatted);
        }
      })
      .catch(() => {
        // Fallback
      })
      .finally(() => {
        if (isMounted) setLoadingDistribution(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dataset?.dataset_id, selectedColumn]);

  const handleFileUpload = async (file) => {
    setIsUploading(true);
    setUploadError(null);
    setCleaningResult(null);

    try {
      const uploadedDataset = await apiService.uploadDataset(file);
      const fullDatasetObj = {
        ...uploadedDataset.profile,
        filename: uploadedDataset.filename,
        dataset_id: uploadedDataset.dataset_id
      };
      setDataset(fullDatasetObj);
      onDatasetLoaded?.(uploadedDataset);
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleOpSelection = (opId) => {
    setSelectedOps(prev => 
      prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]
    );
  };

  const handleApplyCleaning = async () => {
    if (!dataset?.dataset_id || selectedOps.length === 0) return;
    setIsCleaning(true);
    try {
      const res = await apiService.cleanDataset(dataset.dataset_id, selectedOps);
      const updated = {
        ...res.profile,
        filename: res.filename,
        dataset_id: res.dataset_id
      };
      setDataset(updated);
      setCleaningResult(res.summary);
      setSelectedOps([]);
      onDatasetLoaded?.(res);
    } catch (err) {
      alert(`Cleaning error: ${err.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const qualityScore = dataset?.quality_score ?? 99.8;
  const proposedOps = dataset?.proposed_cleaning || [];
  const typeIssues = dataset?.type_issues || [];

  return (
    <div className="page-analysis">
      {/* Editorial Header Banner with Restrained Scientific Flow */}
      <div className="analysis-editorial-hero glass-panel">
        <div className="analysis-hero-content">
          <div className="hero-kicker-strip">
            <span className="hero-kicker-index">02</span>
            <span className="hero-kicker-line" />
            <span className="hero-kicker-tag">DATA ANALYSIS & PROFILING STUDIO</span>
            <span className="hero-kicker-neon-chip" />
          </div>
          <h2 className="analysis-hero-title">Deterministic Vector Ingestion & Profiling</h2>
          <p className="analysis-hero-sub">
            Upload CSV or Excel spreadsheets to trigger autonomous schema profiling, mathematical vector distributions, and deterministic data quality scoring. Analytical grids and controls remain 100% focused and legible.
          </p>
          <div className="analysis-hero-tags">
            <span className="badge badge-neon">Pandas Accelerated</span>
            <span className="badge badge-cyan">Zero Data Modification</span>
            <span className="badge badge-subtle">Automatic Schema Resolution</span>
          </div>
        </div>
        <div className="analysis-hero-media">
          <img 
            src="/images/data-mesh-flow.jpg" 
            alt="Data Analysis Studio — Geometric data flow" 
            className="analysis-hero-img"
          />
          <div className="analysis-media-overlay" />
          <div className="analysis-media-badge">
            <span className="editorial-number">8-POINT</span>
            <span className="editorial-tag">ROLE RESOLUTION</span>
          </div>
        </div>
      </div>

      {/* Upload Banner */}
      <div className="analysis-upload-section">
        <FileUpload onFileUpload={handleFileUpload} isUploading={isUploading} />
        {uploadError && (
          <div className="upload-alert-box glass-panel text-danger">
            <AlertTriangle size={18} />
            <span>Upload Error: {uploadError}</span>
          </div>
        )}
      </div>

      {/* Dataset Selection Bar if datasets exist */}
      {datasets.length > 0 && (
        <div className="dataset-selector-bar glass-panel">
          <div className="dataset-selector-left">
            <Layers size={18} className="text-primary-light" />
            <span className="selector-title">Available Datasets ({datasets.length}):</span>
          </div>
          <div className="dataset-selector-pills">
            {datasets.map((d) => (
              <button
                key={d.dataset_id}
                className={`dataset-pill-btn ${dataset?.dataset_id === d.dataset_id ? 'dataset-pill-active' : ''}`}
                onClick={() => {
                  onSelectDataset?.(d);
                }}
              >
                <FileSpreadsheet size={14} />
                <span>{d.filename}</span>
                <span className="badge badge-subtle">{d.total_rows} rows</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
            <span className="meta-val">{(dataset.total_rows || 0).toLocaleString()} Rows</span>
          </div>

          <div className="meta-card glass-panel">
            <span className="meta-label">Total Features</span>
            <span className="meta-val">{dataset.total_columns || 0} Columns</span>
          </div>

          <div className="meta-card glass-panel">
            <span className="meta-label">Data Quality Index</span>
            <span className={`meta-val ${qualityScore >= 90 ? 'text-emerald' : qualityScore >= 70 ? 'text-amber' : 'text-danger'}`}>
              {qualityScore}% Clean
            </span>
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
          className={`sub-tab-btn ${activeSubTab === 'quality' ? 'sub-tab-active' : ''}`}
          onClick={() => setActiveSubTab('quality')}
        >
          <ShieldAlert size={15} /> Data Quality & Cleaning ({proposedOps.length})
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
            <div>
              <h4>Feature Attribute Matrix & Statistical Moments</h4>
              <p className="table-header-sub">Detected types, null percentages, distinct counts, and statistical parameters.</p>
            </div>
            <span className="badge badge-primary">Auto-Profiled</span>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Detected Type</th>
                  <th>Null %</th>
                  <th>Unique Values</th>
                  <th>Min / Max</th>
                  <th>Mean ± Median</th>
                </tr>
              </thead>
              <tbody>
                {dataset.columns?.map((col) => (
                  <tr key={col.name}>
                    <td className="font-semibold text-primary-light">{col.name}</td>
                    <td>
                      <span className={`badge ${col.type === 'numeric' ? 'badge-primary' : 'badge-warning'}`}>
                        {col.dtype} ({col.type})
                      </span>
                    </td>
                    <td>
                      <span className={col.null_count > 0 ? 'text-amber font-semibold' : 'text-emerald'}>
                        {col.null_pct}% ({col.null_count} nulls)
                      </span>
                    </td>
                    <td>{col.unique_count.toLocaleString()}</td>
                    <td>
                      {col.type === 'numeric' && col.min !== null && col.max !== null
                        ? `${col.min?.toLocaleString()} / ${col.max?.toLocaleString()}`
                        : '—'}
                    </td>
                    <td>
                      {col.type === 'numeric' && col.mean !== null
                        ? `${col.mean?.toLocaleString()} (med: ${col.median?.toLocaleString()})`
                        : 'Categorical'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Data Quality & Cleaning Operations */}
      {activeSubTab === 'quality' && dataset && (
        <div className="quality-studio-wrapper">
          {/* Quality Telemetry Cards */}
          <div className="quality-telemetry-grid">
            <div className="quality-kpi glass-panel">
              <span className="quality-kpi-label">Duplicate Rows</span>
              <span className={`quality-kpi-val ${dataset.duplicate_rows > 0 ? 'text-amber' : 'text-emerald'}`}>
                {dataset.duplicate_rows || 0}
              </span>
              <span className="quality-kpi-sub">
                {dataset.duplicate_rows > 0 ? 'Identical records detected' : 'Zero duplicate rows'}
              </span>
            </div>

            <div className="quality-kpi glass-panel">
              <span className="quality-kpi-label">Missing Cells</span>
              <span className={`quality-kpi-val ${dataset.missing_cells > 0 ? 'text-amber' : 'text-emerald'}`}>
                {dataset.missing_cells || 0}
              </span>
              <span className="quality-kpi-sub">
                {dataset.missing_rate || 0}% overall missingness
              </span>
            </div>

            <div className="quality-kpi glass-panel">
              <span className="quality-kpi-label">Inconsistent Types</span>
              <span className={`quality-kpi-val ${typeIssues.length > 0 ? 'text-amber' : 'text-emerald'}`}>
                {typeIssues.length}
              </span>
              <span className="quality-kpi-sub">
                {typeIssues.length > 0 ? 'Columns with mixed/string numbers' : 'All types coherent'}
              </span>
            </div>
          </div>

          {/* Inconsistent Types Details */}
          {typeIssues.length > 0 && (
            <div className="glass-panel type-issues-box">
              <h4 className="type-issues-title">
                <AlertTriangle size={16} className="text-amber" />
                Detected Data Type Inconsistencies
              </h4>
              <div className="type-issues-list">
                {typeIssues.map((issue, idx) => (
                  <div key={idx} className="type-issue-card">
                    <span className="badge badge-warning">{issue.column}</span>
                    <p className="type-issue-desc">{issue.description}</p>
                    <span className="type-issue-action">{issue.recommended_action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cleaning Result Banner */}
          {cleaningResult && (
            <div className="glass-panel cleaning-success-card">
              <div className="cleaning-success-header">
                <CheckCircle2 size={18} className="text-emerald" />
                <h4>Cleaning Operations Successfully Applied</h4>
              </div>
              <ul className="cleaning-audit-list">
                {cleaningResult.applied_operations?.map((opStr, i) => (
                  <li key={i}>{opStr}</li>
                ))}
              </ul>
              <div className="cleaning-stat-diff">
                <span>Rows: {cleaningResult.rows_before} → <strong>{cleaningResult.rows_after}</strong></span>
                <span>Missing: {cleaningResult.missing_before} → <strong>{cleaningResult.missing_after}</strong></span>
              </div>
            </div>
          )}

          {/* Proposed Cleaning Operations Preview */}
          <div className="glass-panel proposed-cleaning-box">
            <div className="proposed-cleaning-header">
              <div>
                <h4>Proposed Cleaning Operations Preview</h4>
                <p className="cleaning-header-sub">
                  Review proposed transformations before applying them. Data is never modified silently.
                </p>
              </div>
              {proposedOps.length > 0 && (
                <button
                  className="btn btn-primary"
                  disabled={selectedOps.length === 0 || isCleaning}
                  onClick={handleApplyCleaning}
                >
                  <Wand2 size={15} />
                  <span>{isCleaning ? 'Applying Cleaning...' : `Apply Selected (${selectedOps.length})`}</span>
                </button>
              )}
            </div>

            {proposedOps.length === 0 ? (
              <div className="no-ops-banner">
                <CheckCircle2 size={24} className="text-emerald" />
                <p>Dataset is in pristine health! No automated cleaning operations required.</p>
              </div>
            ) : (
              <div className="cleaning-ops-list">
                {proposedOps.map((op) => {
                  const isChecked = selectedOps.includes(op.id);
                  return (
                    <div
                      key={op.id}
                      className={`cleaning-op-item ${isChecked ? 'op-item-checked' : ''}`}
                      onClick={() => toggleOpSelection(op.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="op-checkbox"
                      />
                      <div className="op-content">
                        <div className="op-header">
                          <span className="op-title">{op.title}</span>
                          <span className={`badge ${op.risk === 'Low' ? 'badge-primary' : 'badge-warning'}`}>
                            {op.risk} Risk
                          </span>
                        </div>
                        <p className="op-desc">{op.description}</p>
                        <span className="op-impact"><strong>Impact:</strong> {op.impact}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Distribution Visualizer */}
      {activeSubTab === 'distribution' && dataset && (
        <div className="distribution-view-grid">
          <div className="dist-selector glass-panel">
            <h4>Select Column to Analyze</h4>
            <div className="column-pill-list">
              {dataset.columns?.map((c) => (
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
              subtitle={loadingDistribution ? 'Computing histogram moments...' : `Computed across valid records for ${selectedColumn}`}
              data={distributionData}
              height={280}
              accentColor="var(--chart-1)"
            />
          </div>
        </div>
      )}

      {/* Tab 4: Table Preview */}
      {activeSubTab === 'table' && dataset && (
        <div className="schema-table-container glass-panel">
          <div className="table-header-title">
            <div>
              <h4>Real-Time Ingested Dataset Records</h4>
              <span className="text-secondary text-sm">
                Showing top {dataset.preview?.length || 0} rows of {dataset.total_rows?.toLocaleString()} total records
              </span>
            </div>
            <span className="badge badge-success">Live View</span>
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  {dataset.columns?.map((c) => (
                    <th key={c.name}>{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.preview?.map((row, idx) => (
                  <tr key={idx}>
                    {dataset.columns?.map((c) => (
                      <td key={c.name}>
                        {row[c.name] !== undefined && row[c.name] !== null ? String(row[c.name]) : '—'}
                      </td>
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
