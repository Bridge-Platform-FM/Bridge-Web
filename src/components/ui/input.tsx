import React, { forwardRef } from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  type?: React.HTMLInputTypeAttribute;
  label?: string;
  error?: string;
  /** Show a red `*` after the label (mandatory field). */
  required?: boolean;
  /** Show a blue "Optional" after the label (non-mandatory field). */
  optional?: boolean;
  /** Trailing adornment (icon/button), absolutely positioned at right-4. */
  adornment?: React.ReactNode;
  /** Classes for the adornment wrapper; overrides the default muted color. */
  adornmentClassName?: string;
}

/**
 * Filled input matching the Stitch screens: h-14, bg-surface-container-highest,
 * borderless, rounded-xl, primary focus ring. Uppercase bold label above.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, optional, adornment, adornmentClassName, type = "text", className = "", id, ...props }, ref) => {
    return (
      <div className="flex w-full flex-col gap-2">
        {label && (
          <label
            htmlFor={id}
            className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant"
          >
            {label}
            {required && <span className="align-middle text-base leading-none text-error"> *</span>}
            {optional && <span className="font-medium normal-case text-primary"> (Optional)</span>}
          </label>
        )}
        <div className="group relative">
          <input
            ref={ref}
            id={id}
            type={type}
            className={`h-12 w-full rounded-xl border-none bg-surface-container-highest px-4 text-sm text-on-surface transition-all placeholder:text-outline-variant focus:ring-1 focus:ring-primary/40 ${
              error ? "ring-2 ring-error/60" : ""
            } ${adornment ? "pr-12" : ""} ${className}`}
            {...props}
          />
          {adornment && (
            <div
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                adornmentClassName ?? "text-on-surface-variant"
              }`}
            >
              {adornment}
            </div>
          )}
        </div>
        {error && <span className="px-1 text-xs font-medium text-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
