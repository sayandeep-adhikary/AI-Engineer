import { milestoneById, projectById, topicById, unitById } from "@/data/curriculum";
import type { ActivityEvent, ActivityEventType } from "@/state/types";
import { relativeTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./activitytimeline.module.css";

// Changelog styling — an engineering history, not a social feed.
const EVENT_LABEL: Record<ActivityEventType, { verb: string; glyph: string }> = {
  "topic-started": { verb: "Started topic", glyph: "▶" },
  "unit-started": { verb: "Started unit", glyph: "▷" },
  "unit-completed": { verb: "Completed unit", glyph: "✓" },
  "milestone-completed": { verb: "Completed milestone", glyph: "◆" },
  "project-started": { verb: "Started project", glyph: "▶" },
  "project-completed": { verb: "Completed project", glyph: "✓" },
  "note-added": { verb: "Added note", glyph: "✎" },
  "session-logged": { verb: "Logged session", glyph: "⧗" },
  "stage-advanced": { verb: "Advanced stage", glyph: "▲" },
};

function refName(refType: string, refId: string): string {
  switch (refType) {
    case "topic":
      return topicById.get(refId)?.title ?? refId;
    case "unit":
      return unitById.get(refId)?.title ?? refId;
    case "project":
      return projectById.get(refId)?.title ?? refId;
    case "milestone":
      return milestoneById.get(refId)?.title ?? refId;
    default:
      return refId;
  }
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
  limit?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ActivityTimeline({
  events,
  limit,
  emptyTitle = "No activity yet",
  emptyDescription = "Your engineering history will appear here as you learn and build.",
}: ActivityTimelineProps) {
  const rows = limit ? events.slice(0, limit) : events;

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={<span style={{ fontSize: "1.25rem", color: "var(--text-faint)" }}>▤</span>}
      />
    );
  }

  return (
    <ul className={styles.timeline}>
      {rows.map((e) => {
        const meta = EVENT_LABEL[e.type];
        return (
          <li key={e.id} className={styles.row}>
            <span className={styles.time + " mono"}>{relativeTime(e.timestamp)}</span>
            <span className={styles.glyph} aria-hidden="true">
              {meta.glyph}
            </span>
            <span className={styles.text}>
              {meta.verb} — {refName(e.refType, e.refId)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
