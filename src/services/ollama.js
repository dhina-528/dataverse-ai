/**
 * Direct Local Ollama LLM Service
 * Allows browser-to-Ollama local inference
 */

const OLLAMA_BASE = import.meta.env.VITE_OLLAMA_API_URL || 'http://localhost:11434';

export const ollamaService = {
  /**
   * Check if local Ollama daemon is reachable
   */
  async checkStatus() {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return { online: true, models: data.models || [] };
      }
      return { online: false, models: [] };
    } catch {
      return { online: false, models: [] };
    }
  },

  /**
   * Direct prompt execution via Ollama /api/generate
   */
  async generate(prompt, model = 'llama3.2', systemPrompt = '') {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          system: systemPrompt || 'You are Dataverse AI, an expert business intelligence and data science assistant.',
          stream: false,
        }),
      });

      if (!res.ok) throw new Error(`Ollama error: ${res.statusText}`);
      const data = await res.json();
      return { success: true, text: data.response };
    } catch (err) {
      return { success: false, error: err.message, text: '' };
    }
  },
};
