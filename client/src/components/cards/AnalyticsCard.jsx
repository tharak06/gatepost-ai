import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

export default function AnalyticsCard({ analytics = [], growth = '+60%', timeframe = 'from last mth' }) {
  const chartData = analytics.length > 0 ? analytics : [
    { month: 'Apr', value: 35 },
    { month: 'May', value: 50 },
    { month: 'Jun', value: 70 },
    { month: 'Jul', value: 55 },
    { month: 'Aug', value: 92 }
  ];

  return (
    <div className="glass-card card-top-right">
      <div className="card-anchor" />
      <div className="card-header">
        <h3 className="card-title">
          <BarChart3 className="card-title-icon" size={16} /> Analytics
        </h3>
        <span className="trend-badge">
          <TrendingUp size={11} /> {growth} {timeframe}
        </span>
      </div>

      <div className="analytics-chart-wrapper">
        <div className="chart-y-axis">
          <span>100%</span>
          <span>60%</span>
          <span>40%</span>
          <span>0%</span>
        </div>

        <div className="chart-bars-container">
          {chartData.map((bar) => (
            <div key={bar.month} className="bar-col">
              <div className="bar-tooltip">{bar.value}%</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: `${bar.value}%` }}
                />
              </div>
              <span className="bar-month-label">{bar.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
