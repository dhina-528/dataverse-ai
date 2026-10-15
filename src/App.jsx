import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DataAnalysis } from './pages/DataAnalysis/DataAnalysis';
import { AIInsights } from './pages/AIInsights/AIInsights';
import { Reports } from './pages/Reports/Reports';
import { apiService } from './services/api';
import { 
  X, 
  Settings, 
  Cpu, 
  Activity, 
  Database, 
  Palette, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ollamaStatus, setOllamaStatus] = useState({ status: 'unknown', model_available: false });
  const [backendStatus, setBackendStatus] = useState(false);
  const [activeDataset, setActiveDataset] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const refreshDatasets = async () => {
    const list = await apiService.listDatasets();
    setDatasets(list);
    return list;
  };

  useEffect(() => {
    let isCancelled = false;
    const checkServices = async () => {
      const ollama = await apiService.checkOllamaStatus();
      if (!isCancelled) setOllamaStatus(ollama);

      const backend = await apiService.checkHealth();
      if (!isCancelled) setBackendStatus(backend);

      const isBackendOnline = typeof backend === 'object' ? !!backend.connected : !!backend;
      if (isBackendOnline && !isCancelled) {
        const list = await refreshDatasets();
        if (list.length > 0) {
          setActiveDataset((current) => {
            if (current) {
              const found = list.find((d) => d.dataset_id === current.dataset_id);
              return found ? { ...current, ...found } : current;
            }
            const savedId = sessionStorage.getItem('dataverse_active_dataset_id');
            const target = (savedId && list.find((d) => d.dataset_id === savedId)) || list[0];
            return target;
          });
        }
      }
    };

    checkServices();
    const interval = setInterval(checkServices, 8000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleSelectDataset = (target) => {
    setActiveDataset(target);
    if (target?.dataset_id) {
      sessionStorage.setItem('dataverse_active_dataset_id', target.dataset_id);
    }
  };

  const handleDatasetLoaded = (newDataset) => {
    setActiveDataset(newDataset);
    refreshDatasets();
  };

  const backendOnline = typeof backendStatus === 'object' ? !!backendStatus?.connected : !!backendStatus;
  const ollamaOnline = ollamaStatus?.status === 'connected';

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'layout-sidebar-collapsed' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        activeDataset={activeDataset}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      <div className="app-main-wrapper">
        <Navbar
          activeTab={activeTab}
          ollamaStatus={ollamaStatus}
          backendStatus={backendStatus}
          activeDataset={activeDataset}
          datasets={datasets}
          onSelectDataset={handleSelectDataset}
        />

        <main className="app-content-container">
          {activeTab === 'dashboard' && (
            <Dashboard
              activeDataset={activeDataset}
              datasets={datasets}
              onSelectDataset={handleSelectDataset}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'analysis' && (
            <DataAnalysis
              activeDataset={activeDataset}
              datasets={datasets}
              onSelectDataset={handleSelectDataset}
              onDatasetLoaded={handleDatasetLoaded}
            />
          )}
          {activeTab === 'insights' && (
            <AIInsights
              activeDataset={activeDataset}
              datasets={datasets}
              onSelectDataset={handleSelectDataset}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'reports' && (
            <Reports
              activeDataset={activeDataset}
              datasets={datasets}
              onSelectDataset={handleSelectDataset}
              onNavigate={setActiveTab}
            />
          )}
        </main>
      </div>

      {/* System Settings & Diagnostics Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <Settings size={20} className="text-primary-light" />
                <div>
                  <h3 className="modal-title">System Settings & Platform Architecture</h3>
                  <p className="modal-subtitle">
                    DATAVERSE.AI — Autonomous Data Intelligence Platform configuration and node health.
                  </p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowSettingsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="settings-modal-body">
              {/* Nodes Status Grid */}
              <div className="settings-section">
                <h4 className="settings-section-title">Telemetry Engine Status</h4>
                <div className="settings-nodes-grid">
                  <div className="settings-node-card">
                    <div className="node-card-header">
                      <div className="node-title-wrap">
                        <Activity size={16} className={backendOnline ? "text-teal" : "text-rose"} />
                        <span className="node-name">FastAPI Engine</span>
                      </div>
                      <span className={`badge ${backendOnline ? 'badge-success' : 'badge-danger'}`}>
                        {backendOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <span className="node-endpoint">
                      {backendOnline ? (backendStatus?.url || 'http://localhost:8000/api') : 'Port 8000 unreachable'}
                    </span>
                    <p className="node-desc">
                      High-throughput deterministic Python calculations using vector pandas processing.
                    </p>
                  </div>

                  <div className="settings-node-card">
                    <div className="node-card-header">
                      <div className="node-title-wrap">
                        <Cpu size={16} className={ollamaOnline ? "text-teal" : "text-amber"} />
                        <span className="node-name">Ollama AI Daemon</span>
                      </div>
                      <span className={`badge ${ollamaOnline ? 'badge-primary' : 'badge-subtle'}`}>
                        {ollamaOnline ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                    <span className="node-endpoint">
                      {ollamaOnline ? `Model: ${ollamaStatus?.selected_model || 'installed'}` : 'localhost:11434'}
                    </span>
                    <p className="node-desc">
                      {ollamaOnline 
                        ? 'Local inference engine active for zero-cloud data sovereignty.'
                        : 'Run "ollama serve" to enable local LLM natural language analysis.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Design System & Strict Color Tokens */}
              <div className="settings-section">
                <h4 className="settings-section-title">Minimal Editorial Color System Specification</h4>
                <div className="color-swatches-grid">
                  {[
                    { name: 'Canvas', hex: '#F7F7F4', role: 'Off-White Background' },
                    { name: 'Surface', hex: '#FFFFFF', role: 'Editorial Cards & Panels' },
                    { name: 'Pale Cyan', hex: '#D5F0F0', role: 'Structural Accent & Pillars' },
                    { name: 'Neon Yellow', hex: '#F2FF00', role: 'Telemetry Highlights & CTAs' },
                    { name: 'Dark Text', hex: '#171717', role: 'Primary Typography' },
                    { name: 'Charcoal', hex: '#20232B', role: 'Platform Structural Nodes' },
                    { name: 'Blue-Gray', hex: '#A9BBCB', role: 'Muted Rules & Coordinates' },
                    { name: 'Metric Teal', hex: '#0D9488', role: 'Verified Telemetry Vectors' },
                  ].map((c) => (
                    <div key={c.name} className="color-swatch-card">
                      <div className="swatch-color-box" style={{ backgroundColor: c.hex }} />
                      <div className="swatch-info">
                        <span className="swatch-name">{c.name}</span>
                        <span className="swatch-hex">{c.hex}</span>
                        <span className="swatch-role">{c.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Datasets Storage info */}
              <div className="settings-section">
                <h4 className="settings-section-title">Persistence & Upload Memory</h4>
                <div className="persistence-info-card">
                  <Database size={16} className="text-teal" />
                  <div className="persistence-text">
                    <span>
                      <strong>{datasets.length} Active Dataset{datasets.length === 1 ? '' : 's'} Ingested</strong>
                    </span>
                    <p>
                      Persisted safely on disk under <code>backend/uploads/</code> with full statistical profiling.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowSettingsModal(false)}>
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
