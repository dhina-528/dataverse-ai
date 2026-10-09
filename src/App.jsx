import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar/Navbar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { DataAnalysis } from './pages/DataAnalysis/DataAnalysis';
import { AIInsights } from './pages/AIInsights/AIInsights';
import { Reports } from './pages/Reports/Reports';
import { apiService } from './services/api';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ollamaStatus, setOllamaStatus] = useState({ status: 'unknown', model_available: false });
  const [backendStatus, setBackendStatus] = useState(false);
  const [activeDataset, setActiveDataset] = useState(null);

  useEffect(() => {
    // Check initial service availability
    const checkServices = async () => {
      const ollama = await apiService.checkOllamaStatus();
      setOllamaStatus(ollama);

      const backend = await apiService.checkHealth();
      setBackendStatus(backend);
    };

    checkServices();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="app-main-wrapper">
        <Navbar
          activeTab={activeTab}
          ollamaStatus={ollamaStatus}
          backendStatus={backendStatus}
        />

        <main className="app-content-container">
          {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
          {activeTab === 'analysis' && <DataAnalysis onDatasetLoaded={setActiveDataset} />}
          {activeTab === 'insights' && <AIInsights datasetId={activeDataset?.dataset_id} />}
          {activeTab === 'reports' && <Reports />}
        </main>
      </div>
    </div>
  );
}

export default App;
