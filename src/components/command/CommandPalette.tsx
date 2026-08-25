import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { SignalCommand } from "./commands";
import { searchCommands } from "./commands";
import styles from "./commandpalette.module.css";

interface CommandPaletteProps {
  commands: readonly SignalCommand[];
  onClose: () => void;
}

export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const results = useMemo(() => searchCommands(commands, query), [commands, query]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    document.getElementById(`${listId}-option-${selectedIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [listId, selectedIndex]);

  const execute = (command: SignalCommand) => {
    onClose();
    command.action();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Enter" && results[selectedIndex]) {
      event.preventDefault();
      execute(results[selectedIndex]);
      return;
    }
    if (event.key === "Tab") {
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])') ?? []
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const renderResults = (items: readonly SignalCommand[], heading: string) => (
    <section key={heading} className={styles.group} role="group" aria-labelledby={`${listId}-${heading}`}>
      <h2 id={`${listId}-${heading}`} className={styles.groupLabel}>{heading}</h2>
      {items.map((command) => {
        const index = results.indexOf(command);
        const selected = index === selectedIndex;
        return (
          <div
            id={`${listId}-option-${index}`}
            key={command.id}
            role="option"
            aria-selected={selected}
            className={`${styles.result} ${selected ? styles.selected : ""}`}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => execute(command)}
          >
            <span className={styles.glyph} aria-hidden="true">{command.glyph}</span>
            <span className={styles.resultText}>
              <span className={styles.label}>{command.label}</span>
              <span className={styles.description}>{command.description}</span>
            </span>
            <span className={styles.kind}>{command.group === "Navigation" ? command.shortcut : command.group.slice(0, -1)}</span>
          </div>
        );
      })}
    </section>
  );

  const defaultGroups = ["Navigation", "Actions"] as const;

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Signal command palette"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.searchRow}>
          <span className={styles.prompt} aria-hidden="true">&gt;_</span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands, topics, labs…"
            aria-label="Search commands and curriculum"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results[selectedIndex] ? `${listId}-option-${selectedIndex}` : undefined}
          />
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close command palette">Esc</button>
        </div>

        <div id={listId} className={styles.results} role="listbox" aria-label="Command results">
          {results.length === 0 ? (
            <div className={styles.empty} role="status">
              <span className="mono">NO MATCH</span>
              <span>Try a page, topic, technology, project, or lab.</span>
            </div>
          ) : query.trim() ? (
            renderResults(results, "Results")
          ) : (
            defaultGroups.map((group) => renderResults(results.filter((command) => command.group === group), group))
          )}
        </div>

        <div className={styles.footer} aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> Select</span>
          <span><kbd>Enter</kbd> Run</span>
          <span className={styles.count}>{results.length} indexed result{results.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}