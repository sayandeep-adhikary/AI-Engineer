import type {
  ContentBlock,
  KeyTermBlock,
  CalloutBlock,
  TakeawaysBlock,
} from "@/data/curriculum";
import { Markdown, Inline } from "./Markdown";
import { CodeBlock } from "./CodeBlock";
import { GuidedSteps } from "./GuidedSteps";
import { QuizBlock } from "./QuizBlock";
import { Checkpoint } from "./Checkpoint";
import styles from "./lesson.module.css";

function KeyTerms({ block }: { block: KeyTermBlock }) {
  return (
    <dl className={styles.terms}>
      {block.terms.map((t, i) => (
        <div key={i} className={styles.term}>
          <dt className={styles.termName}>{t.term}</dt>
          <dd className={styles.termDef}>
            <Markdown md={t.definition} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

const CALLOUT_META: Record<CalloutBlock["variant"], { glyph: string; label: string }> = {
  gotcha: { glyph: "⚠", label: "Gotcha" },
  warning: { glyph: "△", label: "Warning" },
  tip: { glyph: "◆", label: "Tip" },
  note: { glyph: "▸", label: "Note" },
};

function Callout({ block }: { block: CalloutBlock }) {
  const meta = CALLOUT_META[block.variant];
  return (
    <aside className={`${styles.callout} ${styles[`callout_${block.variant}`]}`}>
      <div className={styles.calloutHead}>
        <span className={styles.calloutGlyph} aria-hidden="true">
          {meta.glyph}
        </span>
        <span className={styles.calloutLabel}>{meta.label}</span>
        <span className={styles.calloutTitle}>{block.title}</span>
      </div>
      <Markdown md={block.md} className={styles.calloutBody} />
    </aside>
  );
}

function Takeaways({ block }: { block: TakeawaysBlock }) {
  return (
    <section className={styles.takeaways}>
      <span className="overline">Key takeaways</span>
      <ul className={styles.takeawayList}>
        {block.items.map((it, i) => (
          <li key={i}>
            <Inline text={it} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "prose":
      return <Markdown md={block.md} />;
    case "keyTerm":
      return <KeyTerms block={block} />;
    case "code":
      return <CodeBlock block={block} />;
    case "callout":
      return <Callout block={block} />;
    case "steps":
      return <GuidedSteps block={block} />;
    case "quiz":
      return <QuizBlock block={block} />;
    case "checkpoint":
      return <Checkpoint block={block} />;
    case "takeaways":
      return <Takeaways block={block} />;
    default:
      return null;
  }
}

export function LessonView({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className={styles.lesson}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}
