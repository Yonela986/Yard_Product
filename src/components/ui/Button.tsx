import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "quiet";

const variants: Record<ButtonVariant, string> = {
  primary: "yard-button-primary bg-brand text-on-brand active:bg-brand-pressed border border-brand",
  secondary: "yard-button-secondary bg-ground text-ink border border-line active:bg-line",
  quiet: "bg-transparent text-ink underline-offset-4 hover:underline active:bg-line",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  /** Label shown while loading, for example "Saving". */
  loadingLabel?: string;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel = "Working",
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-body font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
