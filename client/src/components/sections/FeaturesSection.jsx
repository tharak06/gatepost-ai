import React from 'react';
import { Eye, FileText, Sparkles, Shield, Cpu, Zap, Lock, ArrowRight } from 'lucide-react';

export default function FeaturesSection({ onTryFeature }) {
  const features = [
    {
      icon: Eye,
      title: "In-Memory Vision Intelligence",
      tag: "Ephemeral Vision",
      desc: "Upload images directly to RAM. Media is streamed directly into Gemini's multi-modal pipeline and erased from memory immediately after inference with 0 disk touches.",
      badge: "Zero-Disk"
    },
    {
      icon: FileText,
      title: "Autonomous PDF Stream Extraction",
      tag: "PyMuPDF / In-Memory Stream",
      desc: "Extract text directly from binary memory streams without creating temporary files or disk scratchpads. Both raw bytes and extracted strings are discarded instantly.",
      badge: "RAM Stream"
    },
    {
      icon: Sparkles,
      title: "Ephemeral Image Synthesis",
      tag: "Serverless Generative AI",
      desc: "Generate high-fidelity cybernetic visual concepts on demand. Images are streamed directly to your browser as base64 data URLs — never stored on server storage or database.",
      badge: "Base64 Transit"
    },
    {
      icon: Shield,
      title: "Physical DB Schema Enforcement",
      tag: "Architecture Guardrail",
      desc: "The database schema has no column or field for file storage. Privacy is physically enforced by software architecture, making data leaks physically impossible.",
      badge: "Hardware-grade"
    }
  ];

  return (
    <section className="site-section" id="features">
      <div className="section-header-wrap">
        <div className="section-badge">
          <Cpu size={13} /> Next-Gen Capabilities
        </div>
        <h2 className="section-title">Engineered for Absolute Speed & Privacy</h2>
        <p className="section-subtitle">
          Explore how GatePost AI combines high-performance autonomous models with guaranteed zero-persistence memory buffers.
        </p>
      </div>

      <div className="features-grid">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="feature-card">
              <div className="feature-card-header">
                <div className="feature-icon-box">
                  <Icon size={20} color="#00f0ff" />
                </div>
                <span className="feature-tag-badge">{f.badge}</span>
              </div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-desc">{f.desc}</p>
              <div className="feature-card-footer">
                <button className="feature-action-link" onClick={onTryFeature}>
                  Experience in Assistant <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
