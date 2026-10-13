import React from 'react';
import { BarChart3, TrendingUp, MessageSquare, Image, ShieldCheck, User } from 'lucide-react';

export default function AnalyticsCard({ userStats, analyticsData }) {
  const username = userStats?.username || 'You';
  const isLoggedIn = userStats?.isLoggedIn || false;
  const chatsCount = analyticsData?.chatsCount ?? userStats?.chatsCount ?? 0;
  const promptsSent = analyticsData?.promptsSent ?? userStats?.messagesCount ?? 0;
  const aiCreations = analyticsData?.aiCreations ?? userStats?.imagesCount ?? 0;
  const email = userStats?.email || 'Guest User';

  // Dynamic user-activity intensity based on real user actions & server telemetry
  const userActivityData = analyticsData?.activityChart && analyticsData.activityChart.length > 0
    ? analyticsData.activityChart
    : [
        { day: 'Mon', value: 12, count: 0 },
        { day: 'Tue', value: 12, count: 0 },
        { day: 'Wed', value: 12, count: 0 },
        { day: 'Thu', value: 12, count: 0 },
        { day: 'Fri', value: 12, count: 0 },
        { day: 'Today', value: promptsSent > 0 ? 100 : 12, count: promptsSent }
      ];

  return (
    <div className="glass-card card-top-right card-analytics">
      <div className="card-top-light" />
      <div className="card-anchor" />

      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-box emerald-glow">
            <BarChart3 className="card-title-icon" size={17} color="#10b981" />
          </div>
          <div>
            <h3 className="card-title">User Usage & Analytics</h3>
            <span className="card-subtitle-meta">Activity for {username}</span>
          </div>
        </div>
        <span className="trend-badge emerald">
          <span className="radar-ping-green" />
          {isLoggedIn ? 'Online' : 'Guest'}
        </span>
      </div>

      {/* User Personal Metric Chips */}
      <div className="analytics-quick-chips">
        <div className="chip-item">
          <span className="chip-label">Saved Chats</span>
          <span className="chip-val green-pulse">{chatsCount}</span>
        </div>
        <div className="chip-divider" />
        <div className="chip-item">
          <span className="chip-label">Prompts Sent</span>
          <span className="chip-val cyan-text">{promptsSent}</span>
        </div>
        <div className="chip-divider" />
        <div className="chip-item">
          <span className="chip-label">AI Creations</span>
          <span className="chip-val">{aiCreations}</span>
        </div>
      </div>

      {/* User Activity Bar Chart */}
      <div className="analytics-chart-wrapper">
        <div className="chart-y-axis">
          <span>High</span>
          <span>Med</span>
          <span>Low</span>
        </div>

        <div className="chart-bars-container">
          {userActivityData.map((bar, i) => (
            <div key={bar.day} className="bar-col" title={bar.tooltip || `${bar.day}: ${bar.count || 0} prompts`}>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    height: `${bar.value}%`,
                    animationDelay: `${i * 0.08}s`
                  }}
                >
                  <div className="bar-glow-tip" />
                </div>
              </div>
              <span className="bar-month-label">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Identity & Retention Pill */}
      <div className="retention-live-badge">
        <ShieldCheck size={13} color="#10b981" />
        <span>100% Private to {username} • 30-Day Cloud Retention</span>
      </div>
    </div>
  );
}
