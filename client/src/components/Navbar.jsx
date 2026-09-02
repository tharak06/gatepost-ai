import React from 'react';
import { Zap, Sparkles, Mic, LayoutDashboard } from 'lucide-react';

export default function Navbar({ activeMode, setActiveMode, onOpenAssistant }) {
  return (
    <header className="navbar">
      <div className="brand" onClick={() => setActiveMode('dashboard')}>
        <div className="brand-icon-wrapper">
          <Zap className="brand-icon" fill="#ffffff" />
        </div>
        <div className="brand-name">
          GaTePoSt <span className="brand-tag">AI</span>
        </div>
      </div>

      <ul className="nav-links">
        <li><a className="nav-link active" href="#overview">Features</a></li>
        <li><a className="nav-link" href="#solutions">Solutions</a></li>
        <li><a className="nav-link" href="#analytics">Analytics</a></li>
        <li><a className="nav-link" href="#resources">Resources</a></li>
        <li><a className="nav-link" href="#about">About</a></li>
      </ul>

      <div className="nav-actions">
        <div className="view-mode-toggle">
          <button
            className={`toggle-btn ${activeMode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMode('dashboard')}
          >
            <LayoutDashboard size={14} /> Dashboard
          </button>
          <button
            className={`toggle-btn ${activeMode === 'assistant' ? 'active' : ''}`}
            onClick={() => onOpenAssistant()}
          >
            <Mic size={14} /> Assistant
          </button>
        </div>

        <button className="btn-nav-cta" onClick={() => onOpenAssistant()}>
          Get started
        </button>
      </div>
    </header>
  );
}
