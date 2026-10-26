import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  helper?: string | undefined;
  error?: string | undefined;
  /** Shown inside the field before the value, for example "R". */
  prefix?: ReactNode;
}

export function Input({ label, helper, error, prefix, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [helper ? helperId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-secondary font-semibold text-ink">
        {label}
      </label>
      <div
        className={cn(
          "yard-input-wrap flex min-h-12 items-center rounded-xl border bg-white transition-all focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgb(31_95_63/0.09)]",
          error ? "border-2 border-status-late" : "border-line",
        )}
      >
        {prefix !== undefined && (
          <span className="pl-3 text-body text-ink-muted" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "min-h-12 w-full min-w-0 bg-transparent px-3 text-body text-ink outline-none placeholder:text-ink-muted",
            prefix !== undefined && "pl-1",
            className,
          )}
          {...rest}
        />
      </div>
      {helper && (
        <p id={helperId} className="text-secondary text-ink-muted">
          {helper}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-secondary font-semibold text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
