import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { BrainCircuit, Send, Sparkles, Cpu, Lightbulb, RefreshCw, Layers } from 'lucide-react';
import './AIInsights.css';

export const AIInsights = ({ datasetId }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [conversation, setConversation] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `👋 **Welcome to Dataverse AI Reasoning Studio.**\n\nI am connected to your dataset context and statistical engine. You can ask deep analytical questions, hypothesize root causes, or request prescriptive strategy recommendations.`,
      model: 'Llama 3.2',
    },
  ]);

  const promptSuggestions = [
    'Analyze primary revenue drivers and variance',
    'Detect non-obvious correlations between features',
    'Generate an executive Q4 strategy summary',
    'Identify top 3 risk factors in the dataset',
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
      if (!datasetId) {
        throw new Error('Upload a dataset in Data Analysis before asking a data question.');
      }

      const res = await apiService.queryAI(datasetId, query, selectedModel);
      const answer = res.response;

      setConversation((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: answer,
          model: selectedModel,
        },
      ]);
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `⚠️ Failed to generate AI insights: ${err.message}`,
          model: selectedModel,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-insights">
      {/* Header with Model Selector */}
      <div className="insights-header glass-panel">
        <div className="insights-header-left">
          <div className="ai-badge-icon">
            <BrainCircuit size={22} className="text-gradient" />
          </div>
          <div>
            <h2 className="ai-title">Local LLM & Ollama Intelligence Studio</h2>
            <p className="ai-desc">
              {ollamaStatus?.status === 'connected'
                ? ollamaStatus.model_available
                  ? `Ollama ready: ${selectedModel}`
                  : `Ollama online, but ${selectedModel} is not installed`
                : 'Ollama offline: start the local service to enable LLM reasoning'}
            </p>
          </div>
        </div>

        <div className="model-selector-wrap">
          <Cpu size={16} className="text-secondary" />
          <label className="model-label">Model:</label>
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value="llama3.2">Llama 3.2 (3B / 8B)</option>
            <option value="mistral">Mistral 7B Instruct</option>
            <option value="deepseek-r1">DeepSeek R1 Distill</option>
            <option value="phi3">Phi-3 Mini</option>
          </select>
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
            placeholder="Ask anything about your datasets, trends, statistical hypotheses..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="btn btn-primary btn-send" disabled={isLoading || !prompt.trim()}>
            <Send size={15} />
            <span>Ask AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};
