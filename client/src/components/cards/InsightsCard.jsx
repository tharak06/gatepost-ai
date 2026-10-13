import React from 'react';
import { Sparkles, Cloud, ShieldCheck, History, UserCheck, MessageSquare } from 'lucide-react';

export default function InsightsCard({ userStats, dynamicInsights }) {
  const username = userStats?.username || 'You';
  const isLoggedIn = userStats?.isLoggedIn || false;
  const email = userStats?.email || 'Guest User';
  const lastChat = userStats?.lastChatTitle || 'New Session';
  const chatsCount = userStats?.chatsCount || 0;

  const iconMap = {
    UserCheck,
    MessageSquare,
    History,
    Sparkles,
    ShieldCheck
  };

  const userInsights = dynamicInsights && dynamicInsights.length > 0
    ? dynamicInsights.map(item => ({
        ...item,
        icon: (typeof item.icon === 'string' && iconMap[item.icon]) ? iconMap[item.icon] : (item.icon || Sparkles)
      }))
    : [
        {
          id: 1,
          text: isLoggedIn
            ? `Account Synced: ${username} (${email})`
            : 'Cloud Vault: Sign in to save chats across devices',
          time: isLoggedIn ? 'Active' : 'Guest',
          icon: UserCheck,
          level: 'optimal'
        },
        {
          id: 2,
          text: chatsCount > 0
            ? `Recent Chat: "${lastChat}" is saved & ready to resume`
            : 'Start your first conversation with GaTePoSt',
          time: 'Cloud',
          icon: MessageSquare,
          level: 'boost'
        },
        {
          id: 3,
          text: '30-Day Chat Retention: All your messages are retained for 30 days',
          time: '30 Days',
          icon: History,
          level: 'optimal'
        },
        {
          id: 4,
          text: 'AI Vision Synthesis: Type "Generate an image of..." to create artwork',
          time: 'Ready',
          icon: Sparkles,
          level: 'ready'
        }
      ];

  return (
    <div className="glass-card card-bottom-right card-insights">
      <div className="card-top-light" />
      <div className="card-anchor" />

      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-box amber-glow">
            <Sparkles className="card-title-icon" size={17} color="#f59e0b" />
          </div>
          <div>
            <h3 className="card-title">User Intelligence</h3>
            <span className="card-subtitle-meta">Personal Activity Feed</span>
          </div>
        </div>
        <span className="live-radar-badge">
          <span className="radar-ping" />
          <span>{isLoggedIn ? 'SYNCED' : 'READY'}</span>
        </span>
      </div>

      <div className="insights-feed-stream">
        {userInsights.map((item, idx) => {
          const IconComponent = item.icon || Sparkles;
          return (
            <div key={item.id || idx} className={`insight-row-item ${item.level || 'optimal'}`}>
              <div className="insight-icon-bubble">
                <IconComponent size={13} color="#00f0ff" />
              </div>
              <div className="insight-body">
                <span className="insight-message">{item.text}</span>
                <span className="insight-time-tag">{item.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
