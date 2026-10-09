import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  BrainCircuit, 
  FileText, 
  Settings, 
  Layers, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'analysis', label: 'Data Analysis Studio', icon: BarChart3 },
    { id: 'insights', label: 'AI Intelligence & Ollama', icon: BrainCircuit, badge: 'AI' },
    { id: 'reports', label: 'Executive Reports', icon: FileText },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <img src="/images/logo.svg" alt="Dataverse AI Logo" className="brand-logo" />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">DATAVERSE<span className="brand-highlight">.AI</span></h1>
          <span className="brand-tagline">Autonomous Data Platform</span>
        </div>
      </div>

      <div className="sidebar-section-title">PRIMARY WORKSPACE</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-btn ${isActive ? 'nav-btn-active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <div className="nav-btn-left">
                <Icon size={18} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </div>
              <div className="nav-btn-right">
                {item.badge && <span className="nav-badge">{item.badge}</span>}
                {isActive && <div className="nav-active-indicator" />}
              </div>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-section-title">INTELLIGENCE SUITE</div>
      <div className="sidebar-quick-status">
        <div className="quick-metric">
          <div className="metric-header">
            <span className="metric-title">Data Ingestion Engine</span>
            <span className="metric-val">100% OK</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="quick-metric">
          <div className="metric-header">
            <span className="metric-title">Ollama Context Window</span>
            <span className="metric-val">8K Tokens</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill progress-fill-cyan" style={{ width: '65%' }}></div>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="footer-system">
          <ShieldCheck size={16} className="text-emerald" />
          <span>Zero-Telemetry Local Privacy</span>
        </div>
      </div>
    </aside>
  );
};
