import React from 'react';
import { Activity, Radio, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

export default function InsightsCard({ insights = [] }) {
  const defaultInsights = [
    { id: 1, text: 'Automate weekly reports', icon: Radio },
    { id: 2, text: 'Activity trend: +34% throughput', icon: TrendingUp },
    { id: 3, text: 'Focus on top priority directives', icon: ShieldCheck }
  ];

  const items = insights.length > 0 ? insights : defaultInsights;

  return (
    <div className="glass-card card-bottom-right">
      <div className="card-anchor" />
      <div className="card-header">
        <h3 className="card-title">
          <Activity className="card-title-icon" size={16} /> Insights
        </h3>
        <span className="insight-icon-pulse">
          <Sparkles size={14} />
        </span>
      </div>

      <div className="insights-feed">
        {items.map((item, idx) => {
          const IconComponent = item.icon && typeof item.icon !== 'string' ? item.icon : Radio;
          return (
            <div key={item.id || idx} className="insight-pill">
              <span className="insight-text">
                <IconComponent size={14} color="#00f0ff" />
                {item.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
