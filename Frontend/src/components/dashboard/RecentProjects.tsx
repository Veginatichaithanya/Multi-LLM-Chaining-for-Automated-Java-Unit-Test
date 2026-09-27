import React from 'react';
import { FolderGit2 } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface RecentProjectsProps {
  onCreateProject: () => void;
}

export const RecentProjects: React.FC<RecentProjectsProps> = ({ onCreateProject }) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Recent Projects
        </h2>
        <span className="text-[11px] font-mono text-slate-500">
          Source Repositories
        </span>
      </div>

      {/* Empty State per specification: No fake projects, clean CTA */}
      <EmptyState
        icon={FolderGit2}
        title="No projects yet"
        description="Create your first Java project analysis to get started."
        actionLabel="Create Project"
        onAction={onCreateProject}
        badge="Projects Database"
      />
    </section>
  );
};
