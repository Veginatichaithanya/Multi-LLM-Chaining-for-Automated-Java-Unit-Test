import React from 'react';
import { Activity } from 'lucide-react';
import { EmptyState } from './EmptyState';

export const RecentActivity: React.FC = () => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Recent Activity
        </h2>
        <span className="text-[11px] font-mono text-slate-500">
          Execution Log
        </span>
      </div>

      {/* Empty State per specification: No fake records */}
      <EmptyState
        icon={Activity}
        title="No recent activity"
        description="Your test generation and experiment activity will appear here."
        badge="Live Audit"
      />
    </section>
  );
};
