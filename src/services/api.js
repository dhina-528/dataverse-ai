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
      return res.ok;
    } catch {
      return false;
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
   * Upload dataset file to backend
   */
  async uploadDataset(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
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
    const res = await fetch(`${API_BASE}/analytics/${datasetId}/distribution?column=${encodeURIComponent(column)}&bins=${bins}`);
    if (!res.ok) throw new Error('Failed to fetch distribution');
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
