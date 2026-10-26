import { ChevronDown } from "lucide-react";
import { useId, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  helper?: string | undefined;
  error?: string | undefined;
  placeholder?: string;
}

export function Select({
  label,
  options,
  helper,
  error,
  placeholder,
  id,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const describedBy = [helper ? helperId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-secondary font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn(
            "min-h-12 w-full appearance-none rounded-xl border bg-white pr-10 pl-3 text-body text-ink transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10",
            error ? "border-2 border-status-late" : "border-line",
            className,
          )}
          {...rest}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-muted"
          strokeWidth={1.5}
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
