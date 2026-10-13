import React from 'react';
import { MessageSquare, Clock, ArrowRight, PlusCircle, Sparkles } from 'lucide-react';

export default function WorkflowCard({ chats = [], onSelectChat, onStartNewChat, username = 'You' }) {
  // Grab around 3 recent chat names from user's history
  const recentChats = chats.slice(0, 3);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 5) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="glass-card card-bottom-left card-workflows">
      <div className="card-top-light" />
      <div className="card-anchor" />

      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-box purple-glow">
            <MessageSquare className="card-title-icon" size={17} color="#a855f7" />
          </div>
          <div>
            <h3 className="card-title">User Chat History</h3>
            <span className="card-subtitle-meta">Recent Conversations for {username}</span>
          </div>
        </div>
        <span className="card-tag-pill live-pulse">
          {chats.length} {chats.length === 1 ? 'CHAT' : 'CHATS'}
        </span>
      </div>

      <div className="workflow-timeline">
        {recentChats.length > 0 ? (
          recentChats.map((c, idx) => (
            <div
              key={c._id || c.id || idx}
              className="chat-history-item-row"
              onClick={() => onSelectChat && onSelectChat(c._id || c.id)}
              title={`Click to open: ${c.title}`}
            >
              <div className="chat-history-number">
                #{idx + 1}
              </div>

              <div className="chat-history-info">
                <span className="chat-history-title">{c.title || `Conversation #${idx + 1}`}</span>
                <span className="chat-history-time">
                  <Clock size={10} /> {formatRelativeTime(c.createdAt)}
                </span>
              </div>

              <div className="chat-history-arrow">
                <ArrowRight size={13} color="#a855f7" />
              </div>
            </div>
          ))
        ) : (
          <div className="empty-history-placeholder">
            <div className="placeholder-row">
              <span className="ph-dot" />
              <span>1. Draft your first prompt</span>
            </div>
            <div className="placeholder-row">
              <span className="ph-dot" />
              <span>2. Summarize & title conversation</span>
            </div>
            <div className="placeholder-row">
              <span className="ph-dot" />
              <span>3. Retain history for 30 days</span>
            </div>
          </div>
        )}

        {/* Quick Launch Button */}
        <button
          className="btn-start-fresh-chat"
          onClick={() => onStartNewChat && onStartNewChat()}
        >
          <PlusCircle size={14} /> Start Fresh Chat
        </button>
      </div>
    </div>
  );
}
