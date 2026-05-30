import React, { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, rows = 3, ...props }, ref) => {
    return (
      <div className="flex w-full flex-col gap-2">
        {label && (
          <label htmlFor={id} className="ml-1 font-label text-sm font-medium text-on-surface-variant">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          className={`w-full resize-none rounded-xl border-none bg-surface-container-highest p-4 text-on-surface transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/40 ${className}`}
          {...props}
        />
        {error && <span className="px-1 text-xs font-medium text-error">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
