import React from 'react';
import { Heart, Shield, Lock, ExternalLink } from 'lucide-react';
import BrandLogo from '../BrandLogo';

export default function AboutFooterSection() {
  return (
    <footer className="site-footer" id="about">
      <div className="footer-top-grid">
        <div className="footer-brand-col">
          <div style={{ marginBottom: '1rem' }}>
            <BrandLogo size={32} />
          </div>
          <p className="footer-tagline">
            The privacy-first conversational AI and autonomous operations platform. Built on the core principle that uploaded media should never touch physical disk or database storage.
          </p>
          <div className="status-live-pill">
            <span className="live-dot" />
            <span>Zero-Disk RAM Enforcement Active</span>
          </div>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-col-title">Navigation</h4>
          <ul className="footer-nav-list">
            <li><a href="#overview">Overview</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#solutions">Solutions</a></li>
            <li><a href="#analytics">Analytics</a></li>
            <li><a href="#about">About</a></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-col-title">Security & Stack</h4>
          <ul className="footer-nav-list">
            <li><span>Google Cloud Firebase</span></li>
            <li><span>In-Memory RAM Buffers</span></li>
            <li><span>Google Gemini Multi-Modal</span></li>
            <li><span>PyMuPDF Stream Parsing</span></li>
            <li><span>JWT & Bcrypt Encryption</span></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <p className="footer-copyright">
          © 2026 GaTePoSt. Architected by Tharak & Gowtham.
        </p>
        <p className="footer-credits">
          Engineered with <Heart size={13} color="#00f0ff" style={{ display: 'inline', verticalAlign: 'middle' }} /> by Tharak & Gowtham
        </p>
      </div>
    </footer>
  );
}
