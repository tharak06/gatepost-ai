import React from 'react';
import { GitBranch, CheckCircle2, Circle, MousePointer } from 'lucide-react';

export default function WorkflowCard({ workflows = [], onTriggerWorkflow }) {
  return (
    <div className="glass-card card-bottom-left">
      <div className="card-anchor" />
      <div className="card-header">
        <h3 className="card-title">
          <GitBranch className="card-title-icon" size={16} /> Workflows
        </h3>
      </div>

      <div className="workflow-timeline">
        {workflows.map((wf) => (
          <div
            key={wf._id || wf.title}
            className={`workflow-node ${wf.status === 'active' ? 'active' : ''}`}
            onClick={() => onTriggerWorkflow && onTriggerWorkflow(wf._id)}
          >
            <div className="node-icon-wrap">
              {wf.status === 'completed' ? (
                <CheckCircle2 size={13} color="#00f0ff" />
              ) : wf.status === 'active' ? (
                <CheckCircle2 size={13} color="#030712" />
              ) : (
                <Circle size={10} color="#64748b" />
              )}
            </div>

            <div className="node-info">
              <span className="node-title">{wf.title}</span>
            </div>
          </div>
        ))}

        <div className="workflow-interactive-cursor">
          <MousePointer size={12} fill="#00f0ff" />
        </div>
      </div>
    </div>
  );
}
