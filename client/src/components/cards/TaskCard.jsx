import React from 'react';
import { CheckSquare, Check } from 'lucide-react';

export default function TaskCard({ tasks = [], onToggleTask }) {
  return (
    <div className="glass-card card-top-left">
      <div className="card-anchor" />
      <div className="card-header">
        <h3 className="card-title">
          <CheckSquare className="card-title-icon" size={16} /> Task Lists
        </h3>
      </div>

      <div className="task-items-list">
        {tasks.map((task) => (
          <div
            key={task._id || task.title}
            className={`task-item ${task.completed ? 'completed' : ''}`}
            onClick={() => onToggleTask(task._id)}
          >
            <div className="task-label">
              <div className="task-checkbox">
                {task.completed && <Check size={12} color="#ffffff" strokeWidth={3} />}
              </div>
              <span>{task.title}</span>
            </div>

            {task.badge && (
              <span className="task-badge-action">
                <Check size={10} /> {task.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
