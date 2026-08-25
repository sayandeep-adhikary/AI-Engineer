import type { ReactNode } from "react";

interface PanelProps {
  title?: ReactNode;
  overline?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "article" | "div";
}

export function Panel({
  title,
  overline,
  actions,
  children,
  className = "",
  bodyClassName = "",
  as: Tag = "section",
}: PanelProps) {
  const hasHeader = Boolean(title || overline || actions);
  return (
    <Tag className={`sg-panel ${className}`}>
      {hasHeader && (
        <header className="sg-panel__header">
          <div className="stack" style={{ gap: 2 }}>
            {overline && <span className="overline">{overline}</span>}
            {title && <h3>{title}</h3>}
          </div>
          {actions && <div className="row" style={{ gap: "var(--space-2)" }}>{actions}</div>}
        </header>
      )}
      <div className={`sg-panel__body ${bodyClassName}`}>{children}</div>
    </Tag>
  );
}
