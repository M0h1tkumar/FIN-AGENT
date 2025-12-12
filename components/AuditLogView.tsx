import React from 'react';
import { AuditLog, AgentRole } from '../types';

interface Props {
  logs: AuditLog[];
}

const AgentIcon: React.FC<{ role: AgentRole }> = ({ role }) => {
  const colors = {
    [AgentRole.AUDITOR]: 'bg-rose-500 shadow-rose-200',
    [AgentRole.LIAISON]: 'bg-indigo-500 shadow-indigo-200',
    [AgentRole.CONTROLLER]: 'bg-emerald-500 shadow-emerald-200',
  };
  
  const initials = {
    [AgentRole.AUDITOR]: 'AU',
    [AgentRole.LIAISON]: 'LI',
    [AgentRole.CONTROLLER]: 'CO',
  };

  return (
    <div className={`w-8 h-8 rounded-full ${colors[role]} flex items-center justify-center text-white text-[10px] font-bold shadow-md ring-4 ring-white relative z-10`}>
      {initials[role]}
    </div>
  );
};

const AuditLogView: React.FC<Props> = ({ logs }) => {
  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (sortedLogs.length === 0) {
    return <div className="p-8 text-center text-slate-400 italic">No activity recorded for this transaction.</div>;
  }

  return (
    <div className="flow-root pl-2">
      <ul className="-mb-8">
        {sortedLogs.map((log, idx) => (
          <li key={log.id}>
            <div className="relative pb-8 group">
              {idx !== sortedLogs.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 group-hover:bg-slate-300 transition-colors" aria-hidden="true" />
              ) : null}
              <div className="relative flex space-x-4">
                <div>
                  <AgentIcon role={log.agent} />
                </div>
                <div className="flex-1 min-w-0 bg-white/50 hover:bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-semibold text-slate-900">
                       {log.action}
                    </p>
                    <time className="text-[10px] font-medium text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-0.5 rounded-full">
                      {new Date(log.timestamp).toLocaleString()}
                    </time>
                  </div>
                  <div className="mb-2">
                     <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{log.agent}</span>
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    <p>{log.details}</p>
                    {log.metadata?.content && (
                       <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 whitespace-pre-wrap shadow-inner">
                          {log.metadata.content.length > 200 ? log.metadata.content.substring(0, 200) + '...' : log.metadata.content}
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AuditLogView;