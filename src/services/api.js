/**
 * API Service for Dataverse AI
 * Communicates with FastAPI backend with seamless local fallback
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiService = {
  /**
   * Health check for backend
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return { connected: true, url: API_BASE, data };
      }
      return { connected: false, url: API_BASE, message: `HTTP ${res.status}` };
    } catch (err) {
      if (API_BASE.includes('localhost')) {
        try {
          const fallbackBase = API_BASE.replace('localhost', '127.0.0.1');
          const res = await fetch(`${fallbackBase}/health`, { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            const data = await res.json();
            return { connected: true, url: fallbackBase, data };
          }
        } catch {
          // ignore
        }
      }
      return { connected: false, url: API_BASE, message: err.message || 'Connection refused' };
    }
  },

  async checkOllamaStatus(model = 'llama3.2') {
    try {
      const res = await fetch(`${API_BASE}/insights/status?model=${encodeURIComponent(model)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error(`Ollama status failed: ${res.status}`);
      return await res.json();
    } catch (error) {
      return { status: 'unknown', models: [], model_available: false, message: error.message };
    }
  },

  /**
   * List all uploaded datasets in the session
   */
  async listDatasets() {
    try {
      const res = await fetch(`${API_BASE}/upload`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.datasets || [];
    } catch {
      return [];
    }
  },

  /**
   * Upload dataset file (CSV, XLSX, XLS, TSV, JSON) to backend
   */
  async uploadDataset(file) {
    if (!file) {
      throw new Error('No file selected.');
    }

    // 50MB client-side guard
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 50MB limit.`);
    }

    const allowed = ['.csv', '.tsv', '.tab', '.json', '.xlsx', '.xls'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      throw new Error(`Unsupported file type "${ext}". Supported formats: ${allowed.join(', ')}`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errorMsg = `Upload failed (${res.status})`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.detail) {
          errorMsg = errorJson.detail;
        }
      } catch {
        // fallback to statusText
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  },

  /**
   * Get correlation matrix for dataset
   */
  async getCorrelations(datasetId) {
    const res = await fetch(`${API_BASE}/analytics/${datasetId}/correlations`);
    if (!res.ok) throw new Error('Failed to fetch correlations');
    return await res.json();
  },

  /**
   * Get distribution for specific column
   */
  async getDistribution(datasetId, column, bins = 10) {
    const res = await fetch(
      `${API_BASE}/analytics/${datasetId}/distribution?column=${encodeURIComponent(column)}&bins=${bins}`
    );
    if (!res.ok) throw new Error('Failed to fetch distribution');
    return await res.json();
  },

  /**
   * Get semantic column candidates and detected roles
   */
  async getDatasetColumns(datasetId) {
    const res = await fetch(`${API_BASE}/analytics/${datasetId}/columns`);
    if (!res.ok) throw new Error('Failed to fetch column mappings');
    return await res.json();
  },

  /**
   * Get live calculated dashboard telemetry with optional user mappings and interactive filters
   */
  async getDashboardMetrics(datasetId, mappings = null, filters = null) {
    let res;
    if (mappings || filters) {
      res = await fetch(`${API_BASE}/analytics/${datasetId}/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings, filters }),
      });
    } else {
      res = await fetch(`${API_BASE}/analytics/${datasetId}/dashboard`);
    }

    if (!res.ok) {
      let msg = 'Failed to fetch dashboard metrics';
      try {
        const err = await res.json();
        if (err.detail) msg = err.detail;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    return await res.json();
  },

  /**
   * Apply selected data quality cleaning operations
   */
  async cleanDataset(datasetId, operations) {
    const res = await fetch(`${API_BASE}/upload/${datasetId}/clean`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });

    if (!res.ok) {
      let msg = 'Cleaning failed';
      try {
        const err = await res.json();
        if (err.detail) msg = err.detail;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    return await res.json();
  },

  /**
   * Query AI Insights from backend
   */
  async queryAI(datasetId, prompt, model = 'llama3.2') {
    const res = await fetch(`${API_BASE}/insights/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId, prompt, model }),
    });
    if (!res.ok) throw new Error('AI query failed');
    return await res.json();
  },
};
