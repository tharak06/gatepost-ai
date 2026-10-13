import React from 'react';

/**
 * Professional GaTePoSt AI Brand Identity Logo
 * Features a custom precision-crafted geometric gateway glyph,
 * dynamic gradient lighting, and responsive typography.
 */
export default function BrandLogo({ size = 30, showTag = true, className = '', onClick }) {
  return (
    <div
      className={`gatepost-brand ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title="GaTePoSt AI"
    >
      <div
        className="gatepost-brand-icon"
        style={{ width: size, height: size, minWidth: size }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="gatepost-svg-symbol"
        >
          <defs>
            <linearGradient id="gpBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="45%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
            <linearGradient id="gpBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>
            <filter id="gpDropGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Premium Rounded Squircle Emblem Frame */}
          <rect
            x="1.5"
            y="1.5"
            width="29"
            height="29"
            rx="8.5"
            fill="url(#gpBadgeGrad)"
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="1"
          />

          {/* Precision Architectural Gateway (Gate + Neural Portal) */}
          {/* Left Gate Column */}
          <path
            d="M8.5 23.5V11C8.5 9.61929 9.61929 8.5 11 8.5H12C13.1046 8.5 14 9.39543 14 10.5V23.5"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right Gate Column */}
          <path
            d="M23.5 23.5V11C23.5 9.61929 22.3807 8.5 21 8.5H20C18.8954 8.5 18 9.39543 18 10.5V23.5"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Neural Aperture & Quantum Core */}
          <circle cx="16" cy="15.5" r="2.2" fill="url(#gpBeamGrad)" filter="url(#gpDropGlow)" />
          <path
            d="M12.5 15.5H19.5"
            stroke="url(#gpBeamGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="gatepost-brand-text-wrap">
        <span className="gatepost-brand-title">GaTePoSt</span>
        {showTag && <span className="gatepost-brand-pill">AI</span>}
      </div>
    </div>
  );
}
