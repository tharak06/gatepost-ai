import React, { useState, useEffect } from 'react';
import { CheckSquare, Check } from 'lucide-react';

export default function TaskCard({ userStats, dynamicTasks }) {
  const username = userStats?.username || 'You';
  const isLoggedIn = userStats?.isLoggedIn || false;
  const chatsCount = userStats?.chatsCount || 0;
  const imagesCount = userStats?.imagesCount || 0;
  const lastChat = userStats?.lastChatTitle || 'First Conversation';

  // User personal checklist
  const [tasks, setTasks] = useState(() => {
    if (dynamicTasks && dynamicTasks.length > 0) return dynamicTasks;
    return [
      { id: '1', title: 'Authenticate personal cloud credentials', completed: isLoggedIn, badge: isLoggedIn ? 'Done' : 'Action' },
      { id: '2', title: `Resume chat: "${lastChat}"`, completed: chatsCount > 0, badge: chatsCount > 0 ? 'Saved' : 'Pending' },
      { id: '3', title: 'Generate high-res AI image via Flux.1', completed: imagesCount > 0, badge: imagesCount > 0 ? 'Made' : 'Try' },
      { id: '4', title: 'Test multi-device sync on mobile phone', completed: false, badge: 'Mobile' }
    ];
  });

  useEffect(() => {
    if (dynamicTasks && dynamicTasks.length > 0) {
      setTasks(dynamicTasks);
    }
  }, [dynamicTasks]);

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="glass-card card-top-left card-task-lists">
      <div className="card-top-light" />
      <div className="card-anchor" />

      <div className="card-header">
        <div className="card-title-group">
          <div className="card-icon-box cyan-glow">
            <CheckSquare className="card-title-icon" size={17} color="#00f0ff" />
          </div>
          <div>
            <h3 className="card-title">User Tasks</h3>
            <span className="card-subtitle-meta">Checklist for {username} ({completedCount}/{totalCount})</span>
          </div>
        </div>
        <span className="card-tag-pill">{progressPercent}% DONE</span>
      </div>

      {/* Cyber Mini Progress Track */}
      <div className="mini-progress-track">
        <div
          className="mini-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="task-items-list">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`task-item ${task.completed ? 'completed' : ''}`}
            onClick={() => toggleTask(task.id)}
            title="Click to check or uncheck"
          >
            <div className="task-label">
              <div className={`custom-checkbox ${task.completed ? 'checked' : ''}`}>
                {task.completed && <Check size={11} color="#030712" strokeWidth={3} />}
              </div>
              <span className="task-name">{task.title}</span>
            </div>

            {task.badge && (
              <span className={`task-badge-action ${task.completed ? 'done' : 'pending'}`}>
                {task.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
