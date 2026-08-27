import { useState } from "react";
import type { CodeBlock as CodeBlockData } from "@/data/curriculum";
import styles from "./lesson.module.css";

const LANG_LABEL: Record<CodeBlockData["language"], string> = {
  python: "Python",
  bash: "Bash",
  text: "Text",
  json: "JSON",
  yaml: "YAML",
};

export function CodeBlock({ block }: { block: CodeBlockData }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(!block.collapsible);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(block.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail quietly.
    }
  };

  if (block.collapsible && !revealed) {
    return (
      <figure className={styles.codeFigure}>
        {block.caption && <figcaption className={styles.codeCaption}>{block.caption}</figcaption>}
        <button
          type="button"
          className={styles.revealSolution}
          onClick={() => setRevealed(true)}
        >
          {block.collapseLabel ?? "Show code"}
        </button>
      </figure>
    );
  }

  return (
    <figure className={styles.codeFigure}>
      {block.caption && <figcaption className={styles.codeCaption}>{block.caption}</figcaption>}
      <div className={styles.codeShell}>
        <div className={styles.codeBar}>
          <span className={`overline ${styles.codeLang}`}>{LANG_LABEL[block.language]}</span>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <pre className={styles.codePre}>
          <code>{block.code}</code>
        </pre>
      </div>
      {block.output != null && (
        <div className={styles.codeOutput}>
          <span className="overline">Output</span>
          <pre className={styles.outputPre}>
            <code>{block.output}</code>
          </pre>
        </div>
      )}
    </figure>
  );
}
