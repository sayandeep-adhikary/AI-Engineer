import { Link } from "react-router-dom";
import { Fragment } from "react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="sg-breadcrumb">
      {items.map((c, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && (
              <span className="sg-breadcrumb__sep" aria-hidden="true">
                /
              </span>
            )}
            {c.to && !isLast ? (
              <Link to={c.to}>{c.label}</Link>
            ) : (
              <span className="sg-breadcrumb__current" aria-current={isLast ? "page" : undefined}>
                {c.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
