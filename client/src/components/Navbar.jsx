import React from 'react';
import { Sparkles, Mic, LayoutDashboard } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Navbar({ activeMode, setActiveMode, onOpenAssistant }) {
  return (
    <header className="navbar">
      <BrandLogo size={32} onClick={() => setActiveMode('dashboard')} />

      <ul className="nav-links">
        <li><a className="nav-link active" href="#overview">Workspace</a></li>
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
