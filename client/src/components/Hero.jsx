import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function Hero({ onGetStarted, onSeeInAction }) {
  return (
    <section className="hero-section">
      <div className="hero-badge">
        <ShieldCheck size={14} className="hero-badge-icon" />
        <span>Architected by Tharak & Gowtham • In-Memory Intelligence</span>
      </div>

      <h1 className="hero-title">
        The Intelligent Perimeter for<br />
        <span className="text-gradient-luxury">Mission-Critical Operations.</span>
      </h1>

      <p className="hero-subtitle">
        GaTePoSt delivers instant multi-modal vision and document synthesis directly in RAM.
        Sign in to chat, analyze photos, and inspect documents with zero disk persistence.
      </p>

      <div className="hero-cta-group">
        <button className="btn-primary" onClick={onGetStarted}>
          <span>Start Chat</span>
          <ArrowRight size={16} />
        </button>
        <button className="btn-secondary" onClick={onSeeInAction}>
          Explore Network System
        </button>
      </div>
    </section>
  );
}
