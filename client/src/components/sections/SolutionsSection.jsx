import React from 'react';
import { ShieldCheck, Building2, Briefcase, Code, CheckCircle, ArrowUpRight } from 'lucide-react';

export default function SolutionsSection({ onOpenAssistant }) {
  const solutions = [
    {
      icon: Building2,
      category: "Enterprise Security",
      title: "Perimeter & Access Control",
      desc: "Deploy autonomous AI checkpoints that inspect identity credentials, visitor logs, and anomaly detection feeds with instant response times and strict zero-logging.",
      points: ["Zero-trace visitor credential inspection", "Real-time perimeter telemetry", "Encrypted JWT session keys"]
    },
    {
      icon: Briefcase,
      category: "Legal & Healthcare",
      title: "Strict Compliance Document Audit",
      desc: "Analyze sensitive contracts, financial portfolios, and patient medical disclosures knowing that uploaded files vanish immediately from RAM upon review.",
      points: ["HIPAA & GDPR-aligned architecture", "No disk caching or cold storage", "Audit-certified transient execution"]
    },
    {
      icon: Code,
      category: "Developers & Infra",
      title: "High-Throughput Autonomous REST API",
      desc: "Integrate GatePost's in-memory multi-modal vision and chat endpoints into your existing software stack using simple standard HTTP headers.",
      points: ["Node & Python SDK compatibility", "Sub-12ms in-memory processing", "Multi-tenant isolation"]
    }
  ];

  return (
    <section className="site-section" id="solutions">
      <div className="section-header-wrap">
        <div className="section-badge">
          <ShieldCheck size={13} /> Tailored Workflows
        </div>
        <h2 className="section-title">Built for Mission-Critical Operations</h2>
        <p className="section-subtitle">
          From high-security enterprise gates to confidentiality-bound legal audits, GatePost delivers uncompromising AI execution.
        </p>
      </div>

      <div className="solutions-grid">
        {solutions.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="solution-card">
              <div className="solution-category-tag">{s.category}</div>
              <div className="solution-card-top">
                <div className="solution-icon-wrap">
                  <Icon size={22} color="#38bdf8" />
                </div>
                <h3 className="solution-title">{s.title}</h3>
              </div>
              <p className="solution-desc">{s.desc}</p>
              <ul className="solution-points-list">
                {s.points.map((pt, pIdx) => (
                  <li key={pIdx} className="solution-point-item">
                    <CheckCircle size={14} color="#00f0ff" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <button className="solution-cta-btn" onClick={onOpenAssistant}>
                Launch Solution <ArrowUpRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
