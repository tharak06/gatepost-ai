import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Sparkles,
  Check,
  CheckCircle2,
  Zap,
  Cloud,
  Terminal,
  RefreshCw,
  Search,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

export default function ModelSelectorModal({ isOpen, onClose, activeModel, onSelectModel }) {
  const [modelsData, setModelsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'ollama' | 'cloud'
  const [customModelInput, setCustomModelInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch models list from API
  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.success) {
        setModelsData(data);
      }
    } catch (e) {
      console.warn('Could not fetch models', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentActive = activeModel || modelsData?.activeModel || 'llama3.2';
  const isOllamaOnline = modelsData?.ollamaOnline ?? true;

  const handleChoose = async (modelId, provider = 'ollama') => {
    try {
      await fetch('/api/models/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, provider })
      });
      localStorage.setItem('gatepost_selected_model', modelId);
      localStorage.setItem('gatepost_selected_provider', provider);
      onSelectModel(modelId, provider);
      setStatusMessage(`Switched active model to ${modelId}!`);
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (e) {
      console.warn('Could not update active model', e);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customModelInput.trim()) return;
    const clean = customModelInput.trim();
    handleChoose(clean, 'ollama');
    setCustomModelInput('');
  };

  const filteredModels = (modelsData?.availableModels || []).filter((m) => {
    if (selectedFilter === 'ollama') return m.provider === 'ollama';
    if (selectedFilter === 'cloud') return m.provider !== 'ollama';
    return true;
  });

  return (
    <div
      className="modal-backdrop-blur"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        boxSizing: 'border-box'
      }}
      onClick={onClose}
    >
      <div className="model-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="model-modal-header">
          <div className="model-header-left">
            <div className="model-icon-glow">
              <Cpu size={20} color="#00f0ff" />
            </div>
            <div>
              <h2 className="model-modal-title">AI Model & Engine Selector</h2>
              <p className="model-modal-subtitle">
                Switch neural engines in real-time. Changes apply instantly.
              </p>
            </div>
          </div>
          <button className="modal-close-icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Engine Status Banner */}
        <div className="engine-status-banner">
          <div className="status-banner-left">
            <span className={`status-dot ${isOllamaOnline ? 'online' : 'offline'}`} />
            <span className="status-banner-text">
              {isOllamaOnline ? (
                <>
                  <strong>Ollama Core Active</strong> &bull; Local server responding at{' '}
                  <code>{modelsData?.ollamaUrl || '127.0.0.1:11434'}</code>
                </>
              ) : (
                <>
                  <strong>Ollama Offline</strong> &bull; Start with{' '}
                  <code>ollama run llama3.2</code> in your terminal
                </>
              )}
            </span>
          </div>
          <button
            className="refresh-models-btn"
            onClick={fetchModels}
            disabled={loading}
            title="Refresh installed models"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {statusMessage && (
          <div className="model-toast-msg">
            <CheckCircle2 size={15} color="#10b981" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="model-filter-tabs">
          <button
            className={`filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            All Models
          </button>
          <button
            className={`filter-tab ${selectedFilter === 'ollama' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('ollama')}
          >
            ⚡ Ollama Local
          </button>
          <button
            className={`filter-tab ${selectedFilter === 'cloud' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('cloud')}
          >
            ☁️ Cloud (Gemini / OpenAI)
          </button>
        </div>

        {/* Models Grid */}
        <div className="model-cards-scrollable">
          <div className="model-cards-grid">
            {filteredModels.map((m) => {
              const isSelected =
                currentActive === m.id ||
                currentActive.startsWith(m.id) ||
                m.id.startsWith(currentActive);
              const isLocalInstalled = m.installed;

              return (
                <div
                  key={m.id}
                  className={`model-card-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleChoose(m.id, m.provider)}
                >
                  <div className="model-card-top">
                    <div className="model-card-title-group">
                      <div className="model-avatar-box">
                        {m.provider === 'ollama' ? (
                          <Zap size={15} color="#00f0ff" />
                        ) : (
                          <Cloud size={15} color="#a855f7" />
                        )}
                      </div>
                      <div>
                        <div className="model-card-name">{m.name}</div>
                        <div className="model-card-id">{m.id}</div>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="active-check-badge">
                        <Check size={12} /> Active
                      </span>
                    ) : isLocalInstalled ? (
                      <span className="installed-tag">Installed 🟢</span>
                    ) : (
                      <span className="available-tag">Ready</span>
                    )}
                  </div>

                  <p className="model-card-desc">{m.description}</p>
                </div>
              );
            })}
          </div>

          {/* Custom Model Input */}
          <div className="custom-model-card">
            <div className="custom-card-header">
              <Terminal size={15} color="#00f0ff" />
              <span>Use Any Custom Ollama Model</span>
            </div>
            <p className="custom-card-sub">
              Have another model in Ollama? Enter its exact name (e.g. <code>qwen2.5-coder</code>,{' '}
              <code>codellama</code>, <code>gemma2:9b</code>):
            </p>
            <form onSubmit={handleCustomSubmit} className="custom-model-form">
              <input
                type="text"
                placeholder="e.g. llama3:8b, mistral, deepseek-r1:7b"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                className="custom-model-input"
              />
              <button type="submit" className="custom-model-submit-btn">
                <span>Activate</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="model-modal-footer">
          <div className="modal-footer-tip">
            💡 <strong>Quick Pull Tip</strong>: In your terminal, type{' '}
            <code>ollama run &lt;model-name&gt;</code> to download any model directly to your PC.
          </div>
          <button className="modal-done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
