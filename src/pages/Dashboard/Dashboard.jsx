import React from 'react';
import { StatCard } from '../../components/StatCard/StatCard';
import { DataChart } from '../../components/Charts/DataChart';
import { MOCK_DASHBOARD_DATA } from '../../utils/mockData';
import { Sparkles, ArrowUpRight, Zap, RefreshCw, Layers } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = ({ onNavigate }) => {
  return (
    <div className="page-dashboard">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Executive Intelligence Overview</h2>
          <p className="page-subtitle">
            Autonomous data aggregation, real-time workload telemetry & AI predictive insights.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            <RefreshCw size={15} />
            <span>Sync Telemetry</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('insights')}>
            <Sparkles size={15} />
            <span>Ask Ollama AI</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="stats-grid">
        {MOCK_DASHBOARD_DATA.stats.map((s) => (
          <StatCard
            key={s.id}
            title={s.title}
            value={s.value}
            change={s.change}
            trend={s.trend}
            subtitle={s.subtitle}
            color={s.color}
          />
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="charts-grid">
        <div className="chart-col-8">
          <DataChart
            type="line"
            title="Monthly Revenue & Pipeline Velocity"
            subtitle="Comparing Q1-Q4 realized revenue against target thresholds"
            data={MOCK_DASHBOARD_DATA.revenueTrend}
            height={260}
            accentColor="#6366f1"
            secondaryColor="#38bdf8"
          />
        </div>

        <div className="chart-col-4">
          <DataChart
            type="bar"
            title="Revenue by Architecture Domain"
            subtitle="Percentage distribution of enterprise workloads"
            data={MOCK_DASHBOARD_DATA.categoryBreakdown}
            height={260}
            accentColor="#06b6d4"
          />
        </div>
      </div>

      {/* Bottom Row: AI Insights Stream & Recent Anomalies */}
      <div className="bottom-grid">
        <div className="glass-panel insight-card-stream">
          <div className="panel-header">
            <div className="header-title-wrap">
              <Zap size={18} className="text-primary-light" />
              <h4>Live AI Reasoning Stream</h4>
            </div>
            <button className="btn-link" onClick={() => onNavigate('insights')}>
              View All Insights <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="insights-list">
            {MOCK_DASHBOARD_DATA.sampleInsights.map((ins) => (
              <div key={ins.id} className="insight-item">
                <div className="insight-item-header">
                  <span className="insight-item-title">{ins.title}</span>
                  <span className="badge badge-primary">{ins.impact}</span>
                </div>
                <p className="insight-item-desc">{ins.description}</p>
                <span className="insight-item-time">{ins.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel workload-health-card">
          <div className="panel-header">
            <div className="header-title-wrap">
              <Layers size={18} className="text-cyan" />
              <h4>Workload Health & Nodes</h4>
            </div>
            <span className="badge badge-success">Nominal</span>
          </div>

          <div className="workload-stats">
            <div className="health-row">
              <span>FastAPI Processing Gateway</span>
              <span className="health-val text-emerald">99.98% Up</span>
            </div>
            <div className="health-row">
              <span>Pandas Vector Processing Memory</span>
              <span className="health-val">1.2 GB / 16 GB</span>
            </div>
            <div className="health-row">
              <span>Local Ollama Model Host</span>
              <span className="health-val text-cyan">Port 11434 (Ready)</span>
            </div>
            <div className="health-row">
              <span>Data Anomaly Confidence Index</span>
              <span className="health-val text-emerald">0.96 (High)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
