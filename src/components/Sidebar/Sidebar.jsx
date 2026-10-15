import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  BrainCircuit, 
  FileText, 
  Settings, 
  UploadCloud, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar = ({ 
  activeTab, 
  onTabChange, 
  isCollapsed = false, 
  onToggleCollapse,
  activeDataset,
  onOpenSettings
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'analysis', label: 'Data Analysis Studio', icon: BarChart3 },
    { id: 'insights', label: 'AI Intelligence & Ollama', icon: BrainCircuit, badge: 'AI' },
    { id: 'reports', label: 'Executive Reports', icon: FileText },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <img src="/images/logo.svg" alt="Dataverse AI" className="brand-logo" />
        </div>
        {!isCollapsed && (
          <div className="brand-text">
            <h1 className="brand-title">DATAVERSE<span className="brand-highlight">.AI</span></h1>
            <span className="brand-tagline">Autonomous Data Intelligence Platform</span>
          </div>
        )}
        <button 
          className="sidebar-collapse-toggle btn-icon"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-section-title">
        {!isCollapsed ? 'PRIMARY WORKSPACE' : '•••'}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-btn ${isActive ? 'nav-btn-active' : ''}`}
              onClick={() => onTabChange(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="nav-btn-left">
                <Icon size={18} className="nav-icon" />
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </div>
              {!isCollapsed && (
                <div className="nav-btn-right">
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                  {isActive && <div className="nav-active-indicator" />}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Ingestion & Datasets Shortcut */}
      <div className="sidebar-section-title">
        {!isCollapsed ? 'DATA & PLATFORM' : '•••'}
      </div>

      <div className="sidebar-nav">
        <button
          className="nav-btn"
          onClick={() => onTabChange('analysis')}
          title="Data Ingestion & Dataset Management"
        >
          <div className="nav-btn-left">
            <UploadCloud size={18} className="nav-icon text-cyan" />
            {!isCollapsed && <span className="nav-label">Data Ingestion</span>}
          </div>
          {!isCollapsed && (
            <span className="badge badge-subtle" style={{ fontSize: '0.65rem' }}>
              {activeDataset ? '1 Active' : '0'}
            </span>
          )}
        </button>

        <button
          className="nav-btn"
          onClick={onOpenSettings}
          title="Settings & System Preferences"
        >
          <div className="nav-btn-left">
            <Settings size={18} className="nav-icon" />
            {!isCollapsed && <span className="nav-label">Settings & Nodes</span>}
          </div>
        </button>
      </div>

      {/* Live System Status Widget (when expanded) */}
      {!isCollapsed && (
        <div className="sidebar-quick-status">
          <div className="quick-metric">
            <div className="metric-header">
              <span className="metric-title">Active Dataset</span>
              <span className="metric-val text-cyan">
                {activeDataset ? (activeDataset.filename.length > 14 ? activeDataset.filename.slice(0, 12) + '...' : activeDataset.filename) : 'Demo Engine'}
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: activeDataset ? '100%' : '50%' }}
              />
            </div>
          </div>

          <div className="quick-metric">
            <div className="metric-header">
              <span className="metric-title">Pandas Vector Pipeline</span>
              <span className="metric-val text-teal">Deterministic</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill progress-fill-teal" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="footer-system" title="Zero-telemetry local data security">
          <ShieldCheck size={16} className="text-teal" />
          {!isCollapsed && <span>Local Privacy Engine</span>}
        </div>
      </div>
    </aside>
  );
};
