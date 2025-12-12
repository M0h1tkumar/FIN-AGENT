import React from 'react';
import { Status } from '../types';

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
  const styles = {
    CLEARED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
    RECTIFYING: 'bg-amber-100 text-amber-800 border-amber-200',
    RECTIFIED: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
};

export default StatusBadge;