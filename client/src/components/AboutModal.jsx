import React from 'react';
import { X, Heart, Shield, Sparkles, Cpu, Lock, Globe } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-dialog-card about-dialog-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="about-modal-header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
            <BrandLogo size={36} />
          </div>
          <p className="about-tagline">
            Confidential Multi-Modal Artificial Intelligence & Vision Engine
          </p>
        </div>

        {/* Creator Attribution Section */}
        <div className="about-creators-card">
          <div className="creators-badge">
            <Sparkles size={13} color="#00f0ff" />
            <span>FOUNDERS & ARCHITECTS</span>
          </div>
          <h4 className="creators-names">Tharak & Gowtham</h4>
          <p className="creators-desc">
            Designed and engineered with a privacy-first ethos, empowering users with instant vision synthesis, natural language reasoning, and cross-device synchronization.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="about-pillars-grid">
          <div className="pillar-item">
            <div className="pillar-icon-box">
              <Lock size={15} color="#00f0ff" />
            </div>
            <div>
              <div className="pillar-title">100% Confidential</div>
              <div className="pillar-desc">Uploaded images and documents are processed in-memory and never exposed.</div>
            </div>
          </div>

          <div className="pillar-item">
            <div className="pillar-icon-box">
              <Globe size={15} color="#a855f7" />
            </div>
            <div>
              <div className="pillar-title">Google Cloud Vault</div>
              <div className="pillar-desc">30-day automatic retention across mobile and desktop devices.</div>
            </div>
          </div>

          <div className="pillar-item">
            <div className="pillar-icon-box">
              <Cpu size={15} color="#10b981" />
            </div>
            <div>
              <div className="pillar-title">Flux.1 Diffusion</div>
              <div className="pillar-desc">Photorealistic natural language image generation built into chat.</div>
            </div>
          </div>

          <div className="pillar-item">
            <div className="pillar-icon-box">
              <Heart size={15} color="#ec4899" />
            </div>
            <div>
              <div className="pillar-title">Autonomous Hub</div>
              <div className="pillar-desc">User-centric activity tracking and live personal workflows.</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="about-modal-footer">
          <span>Version 2.4.0 • Built with pride by <strong>Tharak & Gowtham</strong></span>
        </div>
      </div>
    </div>
  );
}
