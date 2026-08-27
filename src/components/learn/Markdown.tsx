import { Fragment, type ReactNode } from "react";
import styles from "./lesson.module.css";

// A deliberately small, SAFE Markdown subset renderer. It returns React nodes
// only — it never injects raw HTML (no dangerouslySetInnerHTML), so authored
// content cannot introduce script/markup. Supported: paragraphs, bullet ("- ")
// and ordered ("1. ") lists, fenced code blocks (```), and inline **bold**,
// `code`, and [text](https://…) links. Anything else renders as plain text.

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function isSafeUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(url);
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={key} className={styles.inlineCode}>
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, url] = link;
      if (isSafeUrl(url)) {
        return (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        );
      }
      return <Fragment key={key}>{label}</Fragment>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; lines: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++; // closing fence
      blocks.push({ kind: "code", lines: code });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: "p", lines: para });
  }
  return blocks;
}

// Inline-only rendering (bold/italic/code/link) with no block wrapping — for
// short fields like step actions, quiz choices and list items.
export function Inline({ text }: { text: string }) {
  return <>{renderInline(text, "i")}</>;
}

export function Markdown({ md, className }: { md: string; className?: string }) {
  const blocks = parseBlocks(md);
  return (
    <div className={[styles.prose, className].filter(Boolean).join(" ")}>
      {blocks.map((b, i) => {
        if (b.kind === "code") {
          return (
            <pre key={i} className={styles.mdCode}>
              <code>{b.lines.join("\n")}</code>
            </pre>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{renderInline(it, `${i}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{renderInline(b.lines.join(" "), String(i))}</p>;
      })}
    </div>
  );
}
