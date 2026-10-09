import React from 'react';
import { Search, Bell, Sparkles, Cpu, Activity } from 'lucide-react';
import './Navbar.css';

export const Navbar = ({ activeTab, ollamaStatus, backendStatus }) => {
  const ollamaOnline = ollamaStatus?.status === 'connected';
  const modelAvailable = ollamaStatus?.model_available;
  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-breadcrumb">
          <span className="text-secondary">Workspace</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current text-gradient">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </span>
        </div>
      </div>

      <div className="navbar-center">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search datasets, queries, AI models, anomalies..."
            className="search-input"
          />
          <kbd className="search-kbd">⌘K</kbd>
        </div>
      </div>

      <div className="navbar-right">
        {/* Status Indicators */}
        <div className="status-badge" title={ollamaStatus?.message || 'Local Ollama AI Engine'}>
          <Cpu size={14} className={ollamaOnline && modelAvailable ? "icon-active" : "icon-muted"} />
          <span>Ollama: <strong>{!ollamaOnline ? 'Offline' : modelAvailable ? 'Ready' : 'Model Missing'}</strong></span>
          <span className={`status-dot ${ollamaOnline && modelAvailable ? 'dot-online' : 'dot-offline'}`} />
        </div>

        <div className="status-badge" title="FastAPI Analytics Engine">
          <Activity size={14} className={backendStatus ? "icon-active" : "icon-muted"} />
          <span>Backend: <strong>{backendStatus ? 'Connected' : 'Offline'}</strong></span>
          <span className={`status-dot ${backendStatus ? 'dot-online' : 'dot-offline'}`} />
        </div>

        <button className="btn-icon" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-pip" />
        </button>

        <div className="user-profile">
          <div className="avatar">
            <Sparkles size={16} color="#ffffff" />
          </div>
          <div className="user-info">
            <span className="user-name">Data Architect</span>
            <span className="user-role">Enterprise Pro</span>
          </div>
        </div>
      </div>
    </header>
  );
};
