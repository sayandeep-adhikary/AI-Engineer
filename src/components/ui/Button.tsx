import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg";
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const cls = [
    "sg-btn",
    `sg-btn--${variant}`,
    size === "lg" ? "sg-btn--lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
