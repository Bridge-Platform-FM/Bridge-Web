import React, { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Show a red `*` after the label (mandatory field). */
  required?: boolean;
  /** Show a blue "Optional" after the label (non-mandatory field). */
  optional?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, optional, className = "", id, rows = 3, ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          className={`w-full resize-none rounded-xl border-none bg-surface-container-highest p-4 text-sm text-on-surface transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/40 ${className}`}
          {...props}
        />
        {error && <span className="px-1 text-xs font-medium text-error">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
