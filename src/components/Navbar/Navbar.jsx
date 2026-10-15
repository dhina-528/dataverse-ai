import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Sparkles, 
  Cpu, 
  Activity, 
  Database,
  Calendar,
  ChevronDown,
  Check,
  Command,
  FileSpreadsheet
} from 'lucide-react';
import './Navbar.css';

export const Navbar = ({ 
  activeTab, 
  ollamaStatus, 
  backendStatus,
  activeDataset,
  datasets = [],
  onSelectDataset
}) => {
  const [showDatasetMenu, setShowDatasetMenu] = useState(false);
  const [reportingPeriod, setReportingPeriod] = useState('All Time');

  const ollamaOnline = ollamaStatus?.status === 'connected';
  const modelAvailable = ollamaStatus?.model_available;
  const backendOnline = typeof backendStatus === 'object' ? !!backendStatus?.connected : !!backendStatus;

  const backendTooltip = backendOnline
    ? `FastAPI Analytics Engine Active (${backendStatus?.url || 'http://localhost:8000/api'})`
    : `Backend Offline${backendStatus?.message ? `: ${backendStatus.message}` : ''}. Start with: python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`;

  const ollamaTooltip = ollamaOnline && modelAvailable
    ? `Local Ollama AI Connected (${ollamaStatus?.selected_model})`
    : (ollamaStatus?.message || "Ollama Offline. Run 'ollama serve' to enable AI insights.");

  const tabLabels = {
    dashboard: 'Executive Dashboard',
    analysis: 'Data Analysis Studio',
    insights: 'AI Intelligence Studio',
    reports: 'Executive Reports'
  };

  return (
    <header className="navbar">
      {/* Left: Breadcrumb & Title */}
      <div className="navbar-left">
        <div className="navbar-breadcrumb">
          <span className="breadcrumb-root">Dataverse</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current text-gradient">
            {tabLabels[activeTab] || activeTab.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Center: Search & Global Dataset Switcher */}
      <div className="navbar-center">
        <div className="search-bar">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search telemetry, formulas, variables, anomalies (⌘K)..."
            className="search-input"
          />
          <kbd className="search-kbd">⌘K</kbd>
        </div>

        {/* Global Dataset Selector */}
        <div className="global-dataset-selector">
          <button 
            className="dataset-trigger-btn"
            onClick={() => setShowDatasetMenu(!showDatasetMenu)}
            title="Switch active analytical dataset"
          >
            <FileSpreadsheet size={14} className="text-teal" />
            <span className="dataset-trigger-name">
              {activeDataset ? activeDataset.filename : 'No Dataset'}
            </span>
            <ChevronDown size={13} className="text-muted" />
          </button>

          {showDatasetMenu && (
            <div className="dataset-dropdown-menu elevated-panel">
              <div className="dataset-menu-header">
                <span>Active Dataset Scope</span>
                <span className="badge badge-subtle">{datasets.length} Total</span>
              </div>
              <div className="dataset-menu-list">
                {datasets.length === 0 ? (
                  <div className="dataset-empty-item">No datasets uploaded yet</div>
                ) : (
                  datasets.map((d) => {
                    const isSelected = activeDataset?.dataset_id === d.dataset_id;
                    return (
                      <button
                        key={d.dataset_id}
                        className={`dataset-menu-item ${isSelected ? 'dataset-item-selected' : ''}`}
                        onClick={() => {
                          onSelectDataset?.(d);
                          setShowDatasetMenu(false);
                        }}
                      >
                        <div className="dataset-item-left">
                          <FileSpreadsheet size={14} className={isSelected ? 'text-violet' : 'text-muted'} />
                          <div className="dataset-item-info">
                            <span className="dataset-item-title">{d.filename}</span>
                            <span className="dataset-item-meta">
                              {(d.total_rows || 0).toLocaleString()} Rows · {d.total_columns || 0} Cols
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-violet" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Service Status, Notifications & User */}
      <div className="navbar-right">
        {/* Ollama Status */}
        <div className="status-badge" title={ollamaTooltip}>
          <Cpu size={14} className={ollamaOnline && modelAvailable ? "text-teal" : "text-muted"} />
          <span className="status-label">
            Ollama: <strong>{!ollamaOnline ? 'Offline' : modelAvailable ? 'Ready' : 'Model Missing'}</strong>
          </span>
          <span className={`status-dot ${ollamaOnline && modelAvailable ? 'dot-online' : 'dot-offline'}`} />
        </div>

        {/* Backend Status */}
        <div className="status-badge" title={backendTooltip}>
          <Activity size={14} className={backendOnline ? "text-teal" : "text-muted"} />
          <span className="status-label">
            Backend: <strong>{backendOnline ? 'Connected' : 'Offline'}</strong>
          </span>
          <span className={`status-dot ${backendOnline ? 'dot-online' : 'dot-offline'}`} />
        </div>

        {/* Notification Bell */}
        <button className="btn-icon" aria-label="Notifications" title="System Notifications">
          <Bell size={16} />
          <span className="notification-pip" />
        </button>

        {/* User Profile */}
        <div className="user-profile">
          <div className="avatar">
            <Sparkles size={16} color="#ffffff" />
          </div>
          <div className="user-info">
            <span className="user-name">Executive Analyst</span>
            <span className="user-role">Enterprise Suite</span>
          </div>
        </div>
      </div>
    </header>
  );
};
