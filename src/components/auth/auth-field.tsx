"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

export const authFieldClass =
  "h-11 w-full rounded-input border border-border-default bg-background-surface px-3.5 text-sm text-text-primary outline-none transition placeholder:text-text-placeholder focus:border-border-selected focus:ring-2 focus:ring-background-selected";

export const authLabelClass =
  "text-[13px] font-semibold leading-[19.5px] text-text-primary";

export function AuthField({
  id,
  label,
  required = false,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  value,
  onChange,
  action,
  error,
  maxLength,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  action?: ReactNode;
  error?: string | null;
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={authLabelClass}>
          {label}
          {required ? <span className="text-text-accent"> *</span> : null}
        </label>
        {action}
      </div>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${authFieldClass} ${error ? "border-status-error-icon" : ""}`}
      />
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-status-error-text"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
