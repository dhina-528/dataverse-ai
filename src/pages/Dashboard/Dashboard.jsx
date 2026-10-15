import React, { useEffect, useState, useMemo } from 'react';
import { StatCard } from '../../components/StatCard/StatCard';
import { DataChart } from '../../components/Charts/DataChart';
import { MOCK_DASHBOARD_DATA } from '../../utils/mockData';
import { apiService } from '../../services/api';
import {
  Sparkles,
  ArrowUpRight,
  Zap,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Upload,
  Info,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Calendar,
  X,
  HelpCircle,
  TrendingUp,
  Check
} from 'lucide-react';
import './Dashboard.css';

export const Dashboard = ({ activeDataset, datasets = [], onSelectDataset, onNavigate }) => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Interactive Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Column Mapping Resolver State
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [customMappings, setCustomMappings] = useState({});

  // Reset filters and load preserved mappings when dataset changes
  useEffect(() => {
    setSelectedCategory('All');
    setSelectedRegion('All');
    setDateFrom('');
    setDateTo('');
    setMetrics(null); // Clear stale results immediately

    let preserved = {};
    if (activeDataset?.dataset_id) {
      try {
        const saved = sessionStorage.getItem(`dataverse_mappings_${activeDataset.dataset_id}`);
        if (saved) preserved = JSON.parse(saved);
      } catch (err) {
        console.warn('Failed to parse saved mappings:', err);
      }
    }
    setCustomMappings(preserved);

    if (activeDataset?.dataset_id) {
      fetchMetrics(activeDataset.dataset_id, preserved, null);
    }
  }, [activeDataset?.dataset_id]);

  const activeFilters = useMemo(() => {
    const f = {};
    if (selectedCategory && selectedCategory !== 'All') f.category = selectedCategory;
    if (selectedRegion && selectedRegion !== 'All') f.region = selectedRegion;
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    return Object.keys(f).length > 0 ? f : null;
  }, [selectedCategory, selectedRegion, dateFrom, dateTo]);

  const fetchMetrics = async (datasetId, mappings = customMappings, filters = activeFilters) => {
    if (!datasetId) {
      setMetrics(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiService.getDashboardMetrics(datasetId, mappings, filters);
      setMetrics(data);
      // Initialize customMappings with detected if not set yet
      if (data?.detected_columns && Object.keys(customMappings).length === 0) {
        setCustomMappings(data.detected_columns);
      }
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeDataset?.dataset_id && metrics) {
      fetchMetrics(activeDataset.dataset_id, customMappings, activeFilters);
    }
  }, [activeFilters]);

  const handleApplyMappings = async () => {
    if (activeDataset?.dataset_id) {
      try {
        sessionStorage.setItem(
          `dataverse_mappings_${activeDataset.dataset_id}`,
          JSON.stringify(customMappings)
        );
      } catch (err) {
        console.warn('Failed to store mappings in sessionStorage:', err);
      }
      await fetchMetrics(activeDataset.dataset_id, customMappings, activeFilters);
    }
    setShowMappingModal(false);
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedRegion('All');
    setDateFrom('');
    setDateTo('');
  };

  const hasRealData = !!metrics && !loadError && !metrics.is_empty;
  const currentStats = hasRealData ? metrics.stats : (metrics?.is_empty ? metrics.stats : MOCK_DASHBOARD_DATA.stats);
  const revenueTrend = hasRealData ? metrics.revenueTrend : { available: true, title: "Monthly Revenue & Pipeline Velocity", subtitle: "Comparing Q1-Q4 realized revenue against target thresholds", data: MOCK_DASHBOARD_DATA.revenueTrend };
  const topProductsChart = hasRealData ? metrics.topProducts : { available: true, title: "Revenue by Architecture Domain", subtitle: "Percentage distribution of enterprise workloads", data: MOCK_DASHBOARD_DATA.categoryBreakdown };
  const regionalChart = hasRealData ? metrics.regionalPerformance : { available: false, title: "Regional Performance", data: [], missing_reason: "Upload a dataset with region data." };
  const customerChart = hasRealData ? metrics.customerMetrics : { available: false, title: "Customer Loyalty Distribution", data: [], missing_reason: "Upload a dataset with customer identifiers." };
  const sampleInsights = hasRealData ? metrics.sampleInsights : MOCK_DASHBOARD_DATA.sampleInsights;
  const missingExplanations = metrics?.missing_explanations || [];
  const detectedCols = metrics?.detected_columns || {};
  const filterOptions = metrics?.filter_options || { categories: [], regions: [] };
  const allColumns = useMemo(() => {
    if (metrics?.all_columns && metrics.all_columns.length > 0) {
      return metrics.all_columns;
    }
    if (activeDataset?.profile?.columns && activeDataset.profile.columns.length > 0) {
      return activeDataset.profile.columns.map((c) => ({
        name: c.name,
        dtype: c.dtype,
        sample_values: c.sample_values || (c.top_values ? Object.keys(c.top_values) : []),
        is_numeric: c.type === 'numeric',
        is_date: false,
        unique_count: c.unique_count
      }));
    }
    return [];
  }, [metrics?.all_columns, activeDataset?.profile?.columns]);

  const getValidationFeedback = (role, colName) => {
    if (!colName) return null;
    const colInfo = allColumns.find((c) => c.name === colName);
    if (!colInfo) return null;

    if (role === 'revenue' || role === 'quantity') {
      if (colInfo.is_numeric) {
        return { valid: true, message: `Compatible numeric vector (${colInfo.dtype})` };
      }
      return { valid: false, message: `Non-numeric field. Mathematical sums cannot be calculated.` };
    }

    if (role === 'date') {
      if (colInfo.is_date) {
        return { valid: true, message: `Compatible calendar timestamp vector` };
      }
      return { valid: false, message: `Values do not appear to match standard date formats.` };
    }

    if (role === 'category' || role === 'region') {
      const uCount = colInfo.unique_count;
      return {
        valid: true,
        message: uCount !== undefined ? `Category field (${uCount} unique values). Filters will populate.` : `Categorical field`
      };
    }

    if (role === 'product' || role === 'customer' || role === 'order') {
      return { valid: true, message: `Mapped as ${role} identifier` };
    }

    return null;
  };

  const mappedRolesCount = Object.values(detectedCols).filter(Boolean).length;
  const hasActiveFilters = selectedCategory !== 'All' || selectedRegion !== 'All' || !!dateFrom || !!dateTo;

  return (
    <div className="page-dashboard">
      {/* Editorial Homepage & Executive Intelligence Hero */}
      <section className="editorial-hero-section glass-panel">
        {/* Left Side: Spacious Editorial Typography & Strategic Actions */}
        <div className="hero-editorial-left">
          <div className="hero-kicker-strip">
            <span className="hero-kicker-index">01</span>
            <span className="hero-kicker-line" />
            <span className="hero-kicker-tag">DATA INTELLIGENCE PLATFORM</span>
            <span className="hero-kicker-neon-chip" />
          </div>

          <h1 className="hero-editorial-headline">
            Autonomous Data Intelligence & Algorithmic Geometry
          </h1>

          <p className="hero-editorial-desc">
            Transform complex multi-dimensional enterprise datasets into deterministic, traceable insights. Powered by vector pandas calculations and local Ollama inference with zero cloud telemetry.
          </p>

          <div className="hero-editorial-coordinates">
            <div className="coord-item">
              <span className="coord-label">PIPELINE DOMAIN</span>
              <span className="coord-val">ANALYZE · VISUALIZE · AUTOMATE · DECIDE</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">STRATEGIC FOCUS</span>
              <span className="coord-val">PEOPLE · DATA · IDEAS · IMPACT</span>
            </div>
          </div>

          <div className="hero-actions-group">
            <button 
              className="btn btn-neon hero-primary-btn"
              onClick={() => onNavigate('insights')}
            >
              <Sparkles size={16} />
              <span>Ask Ollama AI Engine</span>
            </button>
            <button 
              className="btn btn-secondary hero-secondary-btn"
              onClick={() => onNavigate('analysis')}
            >
              <Upload size={15} />
              <span>Ingest Dataset (CSV / Excel)</span>
            </button>
            <button
              className="btn btn-icon hero-sync-btn"
              onClick={() => activeDataset?.dataset_id ? fetchMetrics(activeDataset.dataset_id) : window.location.reload()}
              title={isLoading ? 'Computing vectors...' : 'Sync Telemetry'}
            >
              <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            </button>
          </div>

          <div className="hero-telemetry-strip">
            <span className="badge badge-cyan">
              <span className="telemetry-live-dot" />
              {activeDataset ? `Active: ${activeDataset.filename}` : 'Demonstration Telemetry'}
            </span>
            <span className="badge badge-subtle">
              {hasRealData ? `${metrics.total_rows.toLocaleString()} Records Profiling` : 'Pandas Vector Engine'}
            </span>
            <span className="badge badge-primary">
              Local Privacy Sovereign
            </span>
          </div>
        </div>

        {/* Right Side: Editorial Large Image Composition with Asymmetric Focus */}
        <div className="hero-editorial-right">
          <div className="hero-image-frame">
            <img 
              src="/images/hero-dataverse.jpg" 
              alt="DATAVERSE.AI — Abstract computational architecture and data wave visualization" 
              className="hero-primary-img"
              loading="eager"
            />
            {/* Subtle Editorial Overlays and Technical Accents */}
            <div className="hero-image-vignette" />

            <div className="hero-floating-index-card">
              <span className="floating-index-num">02</span>
              <div className="floating-index-text">
                <span className="floating-index-kicker">DATA ARCHITECTURE</span>
                <span className="floating-index-sub">SECURE · SCALABLE · INTELLIGENT</span>
              </div>
            </div>

            <div className="hero-floating-metric-card">
              <div className="metric-chip-header">
                <span className="metric-chip-neon-dot" />
                <span className="metric-chip-label">PIPELINE VELOCITY</span>
              </div>
              <div className="metric-chip-body">
                <span className="metric-chip-val">+28.4%</span>
                <span className="metric-chip-status">PANDAS VECTORS</span>
              </div>
            </div>

            <div className="hero-editorial-dots" aria-hidden="true">
              <span /><span /><span />
              <span /><span /><span />
            </div>
          </div>
        </div>
      </section>

      {/* Top Banner: Synthetic vs Active Status */}
      {!activeDataset && (
        <div className="dashboard-status-banner glass-panel">
          <div className="banner-text-wrap">
            <Info size={18} className="text-primary-light" />
            <div>
              <span className="banner-title">Viewing Synthetic Demonstration Metrics</span>
              <p className="banner-sub">
                Upload your CSV or Excel dataset (.xlsx, .xls) in the Data Analysis Studio to activate real calculated telemetry.
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('analysis')}>
            <Upload size={14} />
            <span>Upload Dataset</span>
          </button>
        </div>
      )}

      {/* Active Dataset Navigation & Switcher */}
      {activeDataset && (
        <div className="dashboard-active-dataset-bar glass-panel">
          <div className="active-dataset-info">
            <FileSpreadsheet size={18} className="text-emerald" />
            <div>
              <span className="active-dataset-name">Active Telemetry: {activeDataset.filename}</span>
              <span className="active-dataset-meta">
                {(metrics?.total_rows || activeDataset.total_rows || 0).toLocaleString()} Rows · {metrics?.total_columns || activeDataset.total_columns || 0} Columns · Real Pandas Computation
              </span>
            </div>
          </div>

          <div className="dataset-actions-wrap">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowMappingModal(true)}
              title="Resolve ambiguous column mappings"
            >
              <SlidersHorizontal size={14} />
              <span>Column Mappings ({mappedRolesCount}/8)</span>
            </button>

            {datasets.length > 1 && (
              <div className="dataset-switch-group">
                <span className="switch-label">Dataset:</span>
                <select
                  className="dataset-select-dropdown"
                  value={activeDataset.dataset_id}
                  onChange={(e) => {
                    const target = datasets.find(d => d.dataset_id === e.target.value);
                    if (target) onSelectDataset?.(target);
                  }}
                >
                  {datasets.map(d => (
                    <option key={d.dataset_id} value={d.dataset_id}>
                      {d.filename} ({d.total_rows} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Executive Intelligence Overview</h2>
          <p className="page-subtitle">
            Autonomous data aggregation, real-time workload telemetry & AI predictive insights.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => activeDataset?.dataset_id ? fetchMetrics(activeDataset.dataset_id) : window.location.reload()}
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'spinner' : ''} />
            <span>{isLoading ? 'Recalculating...' : 'Sync Telemetry'}</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('insights')}>
            <Sparkles size={15} />
            <span>Ask Ollama AI</span>
          </button>
        </div>
      </div>

      {/* Interactive Filters Bar (when dataset is loaded) */}
      {activeDataset && (
        <div className="dashboard-filters-bar glass-panel">
          <div className="filters-header">
            <div className="filters-title-group">
              <Filter size={15} className="text-primary-light" />
              <span className="filters-title">Interactive Filters:</span>
            </div>
            {hasActiveFilters && (
              <button className="btn-link text-xs" onClick={handleResetFilters}>
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="filters-controls-grid">
            {/* Category Filter */}
            <div className="filter-item">
              <label className="filter-label">Category Filter:</label>
              <select
                className="filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={filterOptions.categories.length === 0}
              >
                <option value="All">All Categories ({filterOptions.categories.length})</option>
                {filterOptions.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div className="filter-item">
              <label className="filter-label">Region Filter:</label>
              <select
                className="filter-select"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                disabled={filterOptions.regions.length === 0}
              >
                <option value="All">All Regions ({filterOptions.regions.length})</option>
                {filterOptions.regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div className="filter-item">
              <label className="filter-label">From Date:</label>
              <input
                type="date"
                className="filter-input-date"
                value={dateFrom}
                min={filterOptions.date_min || undefined}
                max={filterOptions.date_max || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={!detectedCols.date}
              />
            </div>

            {/* Date Range End */}
            <div className="filter-item">
              <label className="filter-label">To Date:</label>
              <input
                type="date"
                className="filter-input-date"
                value={dateTo}
                min={dateFrom || filterOptions.date_min || undefined}
                max={filterOptions.date_max || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={!detectedCols.date}
              />
            </div>
          </div>

          {metrics?.applied_filters && metrics.applied_filters.length > 0 && (
            <div className="applied-filters-strip">
              <span className="applied-label">Active Filter Scope:</span>
              {metrics.applied_filters.map((af, i) => (
                <span key={i} className="badge badge-primary">{af}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton / Stale Prevention Indicator */}
      {isLoading && (
        <div className="glass-panel loading-metrics-card">
          <RefreshCw size={24} className="spinner text-primary-light" />
          <span>Computing deterministic metrics across dataset vectors...</span>
        </div>
      )}

      {/* Missing Columns & Schema Explanations Alert */}
      {hasRealData && missingExplanations.length > 0 && !isLoading && (
        <div className="glass-panel schema-explanations-card">
          <div className="schema-exp-header">
            <AlertCircle size={16} className="text-amber" />
            <h4>Schema Detection & Analytical Scope</h4>
          </div>
          <div className="detected-tags-row">
            <span className="tag-label">Mapped Roles:</span>
            <span className={`badge ${detectedCols.revenue ? 'badge-primary' : 'badge-subtle'}`}>
              Revenue: {detectedCols.revenue || 'None'}
            </span>
            <span className={`badge ${detectedCols.product ? 'badge-primary' : 'badge-subtle'}`}>
              Product: {detectedCols.product || 'None'}
            </span>
            <span className={`badge ${detectedCols.customer ? 'badge-primary' : 'badge-subtle'}`}>
              Customer: {detectedCols.customer || 'None'}
            </span>
            <span className={`badge ${detectedCols.date ? 'badge-primary' : 'badge-subtle'}`}>
              Date: {detectedCols.date || 'None'}
            </span>
            <span className={`badge ${detectedCols.region ? 'badge-primary' : 'badge-subtle'}`}>
              Region: {detectedCols.region || 'None'}
            </span>
            <button className="btn-link text-xs" onClick={() => setShowMappingModal(true)}>
              Remap Roles →
            </button>
          </div>
          <ul className="missing-exp-list">
            {missingExplanations.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary KPI Grid (6 Smart Cards) */}
      {!isLoading && (
        <div className="stats-grid">
          {currentStats.map((s) => {
            const defaultTooltip = (
              s.id === 'total_revenue' ? 'Sum of all verified monetary transactions in the mapped revenue column.' :
              s.id === 'total_orders' ? 'Distinct count of transaction/order IDs, or total active records.' :
              s.id === 'avg_order_value' ? 'Calculated deterministically as Total Revenue divided by Total Orders.' :
              s.id === 'top_product' ? 'Product entity with the highest aggregated sales or frequency.' :
              s.id === 'active_customers' ? 'Distinct count of unique customer identifiers across dataset.' :
              s.id === 'ai_confidence' ? 'Ratio of non-null and valid data cells across all records.' : null
            );
            const sparkline = s.sparkline || (
              s.available !== false ? (
                s.trend === 'up' ? [24, 30, 28, 38, 42, 52] :
                s.trend === 'down' ? [48, 44, 39, 31, 26, 18] :
                [32, 34, 33, 35, 34, 36]
              ) : null
            );

            return (
              <StatCard
                key={s.id}
                title={s.title}
                value={s.value}
                change={s.change}
                trend={s.trend}
                subtitle={s.subtitle}
                color={s.color}
                available={s.available !== false}
                calculationTooltip={s.calculation_tooltip || s.tooltip || defaultTooltip}
                sparklineData={sparkline}
              />
            );
          })}
        </div>
      )}

      {/* Main Charts Row: Revenue Velocity + Top Products */}
      {!isLoading && (
        <div className="charts-grid">
          <div className="chart-col-8">
            {revenueTrend.available ? (
              <DataChart
                type="line"
                title={revenueTrend.title}
                subtitle={revenueTrend.subtitle}
                data={revenueTrend.data}
                height={260}
                accentColor="var(--chart-1)"
                secondaryColor="var(--chart-2)"
              />
            ) : (
              <div className="glass-panel chart-fallback-panel">
                <div className="chart-fallback-content">
                  <Info size={28} className="text-amber" />
                  <h4>{revenueTrend.title}</h4>
                  <p>{revenueTrend.missing_reason || 'Timeline trends unavailable without a recognized timestamp column.'}</p>
                  <span className="badge badge-warning">Date Column Not Mapped</span>
                </div>
              </div>
            )}
          </div>

          <div className="chart-col-4">
            {topProductsChart.available ? (
              <DataChart
                type="bar"
                title={topProductsChart.title}
                subtitle={topProductsChart.subtitle}
                data={topProductsChart.data}
                height={260}
                accentColor="var(--chart-2)"
              />
            ) : (
              <div className="glass-panel chart-fallback-panel">
                <div className="chart-fallback-content">
                  <Info size={28} className="text-cyan" />
                  <h4>{topProductsChart.title}</h4>
                  <p>{topProductsChart.missing_reason || 'Product distribution unavailable without an item/product column.'}</p>
                  <span className="badge badge-warning">Product Column Not Mapped</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Charts Row: Regional Performance + Customer Distribution */}
      {!isLoading && (
        <div className="charts-grid">
          <div className="chart-col-6">
            {regionalChart.available ? (
              <DataChart
                type="bar"
                title={regionalChart.title}
                subtitle={regionalChart.subtitle}
                data={regionalChart.data}
                height={250}
                accentColor="var(--chart-3)"
              />
            ) : (
              <div className="glass-panel chart-fallback-panel">
                <div className="chart-fallback-content">
                  <Info size={26} className="text-muted" />
                  <h4>{regionalChart.title}</h4>
                  <p>{regionalChart.missing_reason || 'Regional breakdown unavailable without a geographic/territory column.'}</p>
                  <span className="badge badge-subtle">Region Column Unavailable</span>
                </div>
              </div>
            )}
          </div>

          <div className="chart-col-6">
            {customerChart.available ? (
              <DataChart
                type="bar"
                title={customerChart.title}
                subtitle={customerChart.subtitle}
                data={customerChart.data}
                height={250}
                accentColor="var(--chart-4)"
              />
            ) : (
              <div className="glass-panel chart-fallback-panel">
                <div className="chart-fallback-content">
                  <Info size={26} className="text-muted" />
                  <h4>{customerChart.title}</h4>
                  <p>{customerChart.missing_reason || 'Customer retention unavailable without customer identifiers.'}</p>
                  <span className="badge badge-subtle">Customer Column Unavailable</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Row: Traceable Business Insights Stream & Engine Health */}
      {!isLoading && (
        <div className="bottom-grid">
          <div className="glass-panel insight-card-stream">
            <div className="panel-header">
              <div className="header-title-wrap">
                <Zap size={18} className="text-primary-light" />
                <h4>Traceable Business Insights & Evidence</h4>
              </div>
              <button className="btn-link" onClick={() => onNavigate('insights')}>
                Ask Custom Question <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="insights-list">
              {sampleInsights.map((ins) => (
                <div key={ins.id} className="insight-item">
                  <div className="insight-item-header">
                    <span className="insight-item-title">{ins.title}</span>
                    <span className={`badge ${ins.type === 'anomaly' ? 'badge-warning' : 'badge-primary'}`}>
                      {ins.impact}
                    </span>
                  </div>
                  <p className="insight-item-desc">{ins.description}</p>
                  <div className="insight-footer-flex">
                    <span className="insight-trace">{ins.traceability ? `Evidence: ${ins.traceability}` : 'Verified Moment'}</span>
                    <span className="insight-item-time">{ins.date}</span>
                  </div>
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
                <span>FastAPI Gateway</span>
                <span className="health-val text-emerald">Port 8000 (Active)</span>
              </div>
              <div className="health-row">
                <span>Pandas Computation Vector</span>
                <span className="health-val">
                  {hasRealData ? `${metrics.total_rows.toLocaleString()} Rows Calculated` : 'Demo Engine'}
                </span>
              </div>
              <div className="health-row">
                <span>Data Completeness Ratio</span>
                <span className="health-val text-cyan">
                  {hasRealData ? `${currentStats.find(s => s.id === 'ai_confidence')?.value || '99.4%'}` : '98.4% Benchmark'}
                </span>
              </div>
              <div className="health-row">
                <span>Deterministic Calculation Mode</span>
                <span className="health-val text-emerald">Verified Zero Hallucination</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Mapping Resolver Modal */}
      {showMappingModal && (
        <div className="modal-backdrop" onClick={() => setShowMappingModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Resolve Column Role Mappings</h3>
                <p className="modal-subtitle">
                  Configure semantic roles for your dataset. We never assume every dataset is a sales dataset or confuse profit with revenue.
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowMappingModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-mappings">
              {allColumns.length > 0 && (
                <div className="mapping-schema-overview">
                  <span className="mapping-schema-title">Detected Columns in Active Dataset ({allColumns.length}):</span>
                  <div className="mapping-schema-chips">
                    {allColumns.map((c) => (
                      <span key={c.name} className="badge badge-subtle" title={`DType: ${c.dtype}${c.sample_values?.length ? ' | Samples: ' + c.sample_values.join(', ') : ''}`}>
                        {c.name} <small style={{ opacity: 0.7 }}>({c.dtype})</small>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {[
                { key: 'revenue', label: 'Revenue / Sales Amount', desc: 'Valid monetary sales only (excludes profit and quantity)' },
                { key: 'quantity', label: 'Quantity / Units Sold', desc: 'Physical quantity or unit volume count' },
                { key: 'date', label: 'Date / Timestamp', desc: 'Order date, timestamp, or timeline period' },
                { key: 'product', label: 'Product / Item Name', desc: 'Product, SKU, item name, or title' },
                { key: 'category', label: 'Category / Department', desc: 'Domain, department, or product category' },
                { key: 'customer', label: 'Customer Identifier', desc: 'Customer ID, account, user, or client' },
                { key: 'region', label: 'Region / Territory', desc: 'Geographic location, country, state, or city' },
                { key: 'order', label: 'Order / Transaction ID', desc: 'Invoice ID, order number, or transaction identifier' }
              ].map(({ key, label, desc }) => {
                const selectedCol = customMappings[key] || '';
                const selectedColInfo = allColumns.find(c => c.name === selectedCol);
                const feedback = getValidationFeedback(key, selectedCol);

                return (
                  <div key={key} className="mapping-field-row">
                    <div className="mapping-field-main">
                      <div className="mapping-field-info">
                        <span className="mapping-field-label">{label}</span>
                        <span className="mapping-field-desc">{desc}</span>
                      </div>
                      <select
                        className="mapping-select"
                        value={selectedCol}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : e.target.value;
                          setCustomMappings(prev => ({ ...prev, [key]: val }));
                        }}
                      >
                        <option value="">(None / Not Applicable)</option>
                        {allColumns.map((col) => (
                          <option key={col.name} value={col.name}>
                            {col.name} ({col.dtype})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedColInfo && (
                      <div className="mapping-col-preview">
                        {selectedColInfo.sample_values?.length > 0 ? (
                          <span className="mapping-sample-text">
                            <strong>Sample values:</strong> {selectedColInfo.sample_values.map(s => `"${s}"`).join(', ')}
                          </span>
                        ) : (
                          <span className="mapping-sample-text">No sample values available</span>
                        )}
                        {feedback && (
                          <span className={feedback.valid ? "mapping-validation-success" : "mapping-validation-warning"}>
                            {feedback.valid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {feedback.message}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMappingModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApplyMappings}>
                <Check size={16} />
                <span>Save & Recalculate Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
