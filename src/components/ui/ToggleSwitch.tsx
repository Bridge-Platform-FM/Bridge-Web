"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}

/** Labeled track/thumb switch — used for "View ↔ Edit" toggles (Profile page, Meeting
 *  Details modal). */
export function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 select-none focus:outline-none"
    >
      <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
      {/* Track */}
      <span
        className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-outline-variant/60"
        }`}
      >
        {/* Thumb */}
        <span
          className={`absolute left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
