import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center justify-center rounded-2xl px-6 py-10 text-center">
      {icon && (
        <div className="mb-3 text-white/30">{icon}</div>
      )}
      <h3 className="text-sm font-semibold text-white/70">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-white/40">{description}</p>
      )}
    </div>
  );
}
