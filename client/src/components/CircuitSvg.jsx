import React from 'react';

export default function CircuitSvg() {
  return (
    <svg className="connector-canvas-svg" viewBox="0 0 1300 600" preserveAspectRatio="none">
      <defs>
        <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.8" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Path 1: Top-Left (Task Lists) to Orb */}
      <path
        id="path-tl"
        className="connector-path"
        d="M 350 160 C 440 160, 480 250, 560 270"
      />
      <circle className="connector-node-dot" cx="350" cy="160" r="4.5" />
      <circle r="3.5" fill="#ffffff" filter="url(#glow)">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 350 160 C 440 160, 480 250, 560 270" />
      </circle>

      {/* Path 2: Bottom-Left (Workflows) to Orb */}
      <path
        id="path-bl"
        className="connector-path"
        d="M 350 440 C 440 440, 480 350, 560 330"
      />
      <circle className="connector-node-dot" cx="350" cy="440" r="4.5" />
      <circle r="3.5" fill="#00f0ff" filter="url(#glow)">
        <animateMotion dur="3.5s" repeatCount="indefinite" path="M 350 440 C 440 440, 480 350, 560 330" />
      </circle>

      {/* Path 3: Top-Right (Analytics) to Orb */}
      <path
        id="path-tr"
        className="connector-path"
        d="M 950 160 C 860 160, 820 250, 740 270"
      />
      <circle className="connector-node-dot" cx="950" cy="160" r="4.5" />
      <circle r="3.5" fill="#ffffff" filter="url(#glow)">
        <animateMotion dur="2.8s" repeatCount="indefinite" path="M 950 160 C 860 160, 820 250, 740 270" />
      </circle>

      {/* Path 4: Bottom-Right (Insights) to Orb */}
      <path
        id="path-br"
        className="connector-path"
        d="M 950 440 C 860 440, 820 350, 740 330"
      />
      <circle className="connector-node-dot" cx="950" cy="440" r="4.5" />
      <circle r="3.5" fill="#00f0ff" filter="url(#glow)">
        <animateMotion dur="3.2s" repeatCount="indefinite" path="M 950 440 C 860 440, 820 350, 740 330" />
      </circle>
    </svg>
  );
}
