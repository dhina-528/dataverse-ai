import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import {
  BrainCircuit,
  Send,
  Sparkles,
  Cpu,
  Lightbulb,
  FileSpreadsheet,
  AlertCircle,
  Upload,
  Layers
} from 'lucide-react';
import './AIInsights.css';

export const AIInsights = ({
  activeDataset,
  datasets = [],
  onSelectDataset,
  onNavigate
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('meta-llama/Llama-3.2-3B-Instruct');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [conversation, setConversation] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `👋 **Welcome to Dataverse AI Reasoning Studio.**\n\nI am connected to your dataset context and statistical engine. You can ask deep analytical questions, hypothesize root causes, or request prescriptive strategy recommendations.`,
      model: 'Dataverse Engine',
    },
  ]);

  const promptSuggestions = [
    'Analyze primary revenue drivers and variance',
    'Detect non-obvious correlations between features',
    'Generate an executive summary of dataset trends',
    'Identify top 3 risk factors or anomalies in the dataset',
  ];

  useEffect(() => {
    let cancelled = false;
    apiService.checkOllamaStatus(selectedModel).then((status) => {
      if (!cancelled) setOllamaStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedModel]);

  const handleSendPrompt = async (textToSend) => {
    const query = textToSend || prompt;
    if (!query.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: query,
    };

    setConversation((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      if (!activeDataset?.dataset_id) {
        throw new Error('No active dataset selected. Please upload or select a dataset in Data Analysis first.');
      }

      const res = await apiService.queryAI(activeDataset.dataset_id, query, selectedModel);
      const answer = res.response;

      setConversation((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: answer,
          model: res.source === 'ollama' ? selectedModel : 'Deterministic Engine',
        },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `⚠️ ${err.message}`,
          model: selectedModel,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-insights">
      {/* Active Dataset Status Bar or No Dataset Warning */}
      {!activeDataset ? (
        <div className="insights-status-banner banner-warning glass-panel">
          <div className="banner-content">
            <AlertCircle size={18} className="text-amber" />
            <div>
              <strong className="banner-heading">No Active Dataset Loaded</strong>
              <span className="banner-subtext">
                To query metrics and receive verified analytical reasoning, please upload a dataset first.
              </span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate?.('analysis')}>
            <Upload size={14} />
            <span>Upload Dataset in Studio</span>
          </button>
        </div>
      ) : (
        <div className="insights-status-banner banner-active glass-panel">
          <div className="banner-content">
            <FileSpreadsheet size={18} className="text-teal" />
            <div>
              <span className="banner-heading">Active Context: {activeDataset.filename}</span>
              <span className="banner-subtext">
                {(activeDataset.total_rows || activeDataset.profile?.total_rows || 0).toLocaleString()} records · Calculations verified via Pandas
              </span>
            </div>
          </div>

          {datasets.length > 1 && (
            <div className="insights-dataset-switch">
              <span className="switch-label">Dataset:</span>
              <select
                className="insights-dataset-select"
                value={activeDataset.dataset_id}
                onChange={(e) => {
                  const target = datasets.find(d => d.dataset_id === e.target.value);
                  if (target) onSelectDataset?.(target);
                }}
              >
                {datasets.map(d => (
                  <option key={d.dataset_id} value={d.dataset_id}>{d.filename}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Editorial AI Intelligence Banner featuring Google DeepMind Visualising AI neural architecture */}
      <div className="insights-editorial-banner glass-panel">
        <div className="insights-banner-content">
          <div className="hero-kicker-strip">
            <span className="hero-kicker-index">03</span>
            <span className="hero-kicker-line" />
            <span className="hero-kicker-tag">AI INTELLIGENCE & REASONING STUDIO</span>
            <span className="hero-kicker-neon-chip" />
          </div>

          <div className="insights-title-row">
            <div className="ai-badge-icon">
              <BrainCircuit size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="ai-title">Autonomous AI Analytics & Reasoning Studio</h2>
              <p className="ai-desc">
                {selectedModel.includes('Llama-3.2-3B')
                  ? 'Hugging Face Hub inference · Model: meta-llama/Llama-3.2-3B-Instruct · Zero Hallucination Mode'
                  : (ollamaStatus?.status === 'connected'
                      ? `Ollama local inference · Model: ${selectedModel}`
                      : 'Deterministic Pandas vector calculations active with strict statistical integrity')}
              </p>
            </div>
          </div>

          <div className="insights-model-bar">
            <div className="model-selector-wrap">
              <Cpu size={15} className="text-secondary" />
              <label className="model-label">Inference Engine:</label>
              <select
                className="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                <option value="meta-llama/Llama-3.2-3B-Instruct">Hugging Face: Llama 3.2 3B Instruct</option>
                <option value="llama3.2">Ollama: Llama 3.2 (Local)</option>
                <option value="mistral">Ollama: Mistral 7B (Local)</option>
                <option value="deepseek-r1">Ollama: DeepSeek R1 (Local)</option>
                <option value="phi3">Ollama: Phi-3 Mini (Local)</option>
              </select>
            </div>

            <div className="insights-telemetry-tags">
              <span className="badge badge-neon">
                {selectedModel.includes('meta-llama') ? 'HF Inference API' : (ollamaStatus?.status === 'connected' ? 'Ollama Online' : 'Pandas Deterministic')}
              </span>
              <span className="badge badge-cyan">Zero Hallucination</span>
            </div>
          </div>
        </div>

        <div className="insights-banner-media">
          <img 
            src="/images/ai-neural-core.jpg" 
            alt="AI Intelligence Studio — DeepMind Visualising AI neural architecture" 
            className="insights-banner-img"
          />
          <div className="insights-media-overlay" />
          <div className="insights-media-caption">
            <span className="editorial-number">NEURAL MATRIX</span>
            <span className="editorial-tag">LOCAL TENSORS</span>
          </div>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="suggestions-row">
        {promptSuggestions.map((s, idx) => (
          <button
            key={idx}
            className="suggestion-chip"
            onClick={() => handleSendPrompt(s)}
          >
            <Lightbulb size={13} className="text-cyan" />
            <span>{s}</span>
          </button>
        ))}
      </div>

      {/* Chat / Reasoning Stream Area */}
      <div className="chat-container glass-panel">
        <div className="messages-stream">
          {conversation.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}
            >
              <div className="message-header">
                <span className="message-author">
                  {msg.role === 'user' ? 'You' : `Dataverse AI (${msg.model || 'Engine'})`}
                </span>
              </div>
              <div className="message-body">
                <p style={{ whiteSpace: 'pre-line' }}>{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-bubble message-ai message-loading">
              <Sparkles size={16} className="spinner text-primary-light" />
              <span>Synthesizing data vectors with {selectedModel}...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          className="chat-input-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
        >
          <input
            type="text"
            className="chat-input"
            placeholder={activeDataset ? "Ask anything about your dataset (trends, aggregations, risk factors)..." : "Upload a dataset first to query real figures..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading || !activeDataset}
          />
          <button
            type="submit"
            className="btn btn-primary btn-send"
            disabled={isLoading || !prompt.trim() || !activeDataset}
          >
            <Send size={15} />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};
