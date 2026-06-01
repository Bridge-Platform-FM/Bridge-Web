"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Option } from "@/lib/startup-profile-options";

interface BaseProps {
  label?: string;
  error?: string;
  placeholder?: string;
  options: Option[];
  id?: string;
  disabled?: boolean;
  /** Enforce a selection via native form validation. */
  required?: boolean;
  "aria-label"?: string;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type SelectProps = SingleProps | MultiProps;

/**
 * Input-styled dropdown with a popover list of rows. Single-select shows the
 * chosen label and closes on pick; `multiple` shows removable chips, checkboxes,
 * and stays open while toggling. Closes on outside-click / Esc.
 */
export function Select(props: SelectProps) {
  const { label, error, placeholder = "Select…", options, id, disabled, required } = props;
  const ariaLabel = props["aria-label"];
  const multiple = props.multiple === true;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedValues = props.multiple ? props.value : props.value ? [props.value] : [];
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  const pick = (v: string) => {
    if (props.multiple) {
      props.onChange(props.value.includes(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    } else {
      props.onChange(v);
      setOpen(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant"
        >
          {label}
        </label>
      )}

      <div ref={rootRef} className="relative">
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border-none bg-surface-container-highest px-4 text-left transition-all focus:ring-1 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
            multiple ? "min-h-14 py-2" : "h-14"
          } ${error ? "ring-2 ring-error/60" : ""}`}
        >
          {selectedValues.length === 0 ? (
            <span className="text-on-surface-variant">{placeholder}</span>
          ) : multiple ? (
            <span className="flex flex-wrap gap-1.5">
              {selectedValues.map((v) => (
                <span
                  key={v}
                  className="flex items-center gap-1 rounded-lg bg-secondary-container px-2 py-1 text-xs font-medium text-on-secondary-container"
                >
                  {labelFor(v)}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${labelFor(v)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      pick(v);
                    }}
                    className="flex cursor-pointer items-center hover:text-on-surface"
                  >
                    <Icon name="close" size={14} />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-on-surface">{labelFor(selectedValues[0])}</span>
          )}
          <Icon name="expand_more" size={20} className="shrink-0 text-on-surface-variant" />
        </button>

        {required && (
          // Focusable, visually-hidden mirror so native form validation enforces a selection.
          <input
            tabIndex={-1}
            aria-hidden="true"
            required
            value={selectedValues.length ? "set" : ""}
            onChange={() => {}}
            className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-0 opacity-0"
          />
        )}

        {open && (
          <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-1 shadow-lg">
            {options.map((o) => {
              const isSelected = selectedValues.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-container ${
                    !multiple && isSelected ? "bg-surface-container font-semibold text-on-surface" : "text-on-surface"
                  }`}
                >
                  {multiple ? (
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-primary bg-primary text-on-primary" : "border-outline-variant"
                      }`}
                    >
                      {isSelected && <Icon name="check" size={14} />}
                    </span>
                  ) : null}
                  <span className="flex-1">{o.label}</span>
                  {!multiple && isSelected && <Icon name="check" size={16} className="text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <span className="px-1 text-xs font-medium text-error">{error}</span>}
    </div>
  );
}
