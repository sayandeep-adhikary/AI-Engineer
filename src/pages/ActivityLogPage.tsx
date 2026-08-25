import { useProgressStore } from "@/state/progressStore";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Panel } from "@/components/ui/Panel";
import { ActivityTimeline } from "@/components/domain/ActivityTimeline";

export function ActivityLogPage() {
  const events = useProgressStore((s) => s.events);

  return (
    <div className="stack" style={{ gap: "var(--space-5)" }}>
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <Breadcrumb items={[{ label: "Analytics", to: "/analytics" }, { label: "Activity" }]} />
        <h1>Activity</h1>
        <p className="text-secondary" style={{ maxWidth: "60ch" }}>
          Your full engineering changelog — every recorded learning and build event.
        </p>
      </div>

      <Panel overline="Full history" title={`${events.length} event${events.length === 1 ? "" : "s"}`}>
        <ActivityTimeline events={events} />
      </Panel>
    </div>
  );
}
