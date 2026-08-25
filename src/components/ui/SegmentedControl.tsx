interface SegOption<T extends string> {
  value: T;
  label: string;
  glyph?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "md" | "sm";
}

// Accessible segmented control: a labelled group of toggle buttons using
// aria-pressed. Fully keyboard operable (each option is a real button).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: SegmentedControlProps<T>) {
  return (
    <div className={`sg-seg ${size === "sm" ? "sg-seg--sm" : ""}`} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`sg-seg__btn ${active ? "is-active" : ""}`}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
          >
            {opt.glyph && (
              <span aria-hidden="true" className="sg-seg__glyph">
                {opt.glyph}
              </span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
