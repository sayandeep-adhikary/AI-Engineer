import { Breadcrumb, type Crumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";

interface PlaceholderPageProps {
  title: string;
  phase: string;
  crumbs: Crumb[];
}

export function PlaceholderPage({ title, phase, crumbs }: PlaceholderPageProps) {
  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <Breadcrumb items={crumbs} />
        <h1>{title}</h1>
      </div>
      <EmptyState
        title={`${title} arrives in ${phase}`}
        description="This surface is scaffolded and routed. Its full implementation is scheduled for a later phase."
        icon={<span style={{ fontSize: "1.5rem", color: "var(--text-faint)" }}>◇</span>}
      />
    </div>
  );
}
