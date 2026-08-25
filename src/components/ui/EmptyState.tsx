import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="sg-empty">
      {icon && <div aria-hidden="true">{icon}</div>}
      <span className="sg-empty__title">{title}</span>
      {description && <span className="caption">{description}</span>}
      {action && <div style={{ marginTop: "var(--space-2)" }}>{action}</div>}
    </div>
  );
}
