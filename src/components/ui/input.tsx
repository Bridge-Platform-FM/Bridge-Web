import React, { forwardRef } from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
    type?: React.HTMLInputTypeAttribute | "textarea";
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
    rows?: number;
}

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
    (
        {
            label,
            error,
            icon,
            iconPosition = "right",
            type = "text",
            className = "",
            disabled,
            rows = 4,
            ...props
        },
        ref
    ) => {
        // Focus, default, and error states
        const borderClass = error
            ? "focus:ring-4 focus:ring-red-500/10 border border-red-500 bg-red-50/50 text-slate-900"
            : "focus:ring-4 focus:ring-blue-500/10 border border-transparent focus:border-blue-500/40 focus:bg-white text-slate-900";

        if (type === "checkbox" || type === "radio") {
            return (
                <div className="flex flex-col gap-1.5 w-fit">
                    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`}>
                        <input
                            ref={ref as React.Ref<HTMLInputElement>}
                            type={type}
                            disabled={disabled}
                            className={`w-4 h-4 cursor-pointer accent-blue-600 transition-all ${error ? "outline outline-1 outline-red-500 outline-offset-1" : ""}`}
                            {...props}
                        />
                        {label && (
                            <span className={`text-sm font-medium select-none ${error ? "text-red-500" : "text-slate-900"}`}>
                                {label}
                            </span>
                        )}
                    </label>
                    {error && (
                        <span className="text-xs text-red-500 font-medium px-1 mt-0.5">
                            {error}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div className={`flex flex-col gap-1.5 w-full ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
                {label && (
                    <label className="text-[11px] font-bold text-slate-500 tracking-wide px-1 uppercase select-none">
                        {label}
                    </label>
                )}
                <div className="relative w-full flex items-center">
                    {icon && iconPosition === "left" && type !== "textarea" && (
                        <div className="absolute left-4 text-slate-400 flex items-center justify-center">
                            {icon}
                        </div>
                    )}

                    {type === "textarea" ? (
                        <textarea
                            ref={ref as React.Ref<HTMLTextAreaElement>}
                            disabled={disabled}
                            rows={rows}
                            className={`w-full min-h-[100px] p-4 bg-slate-100 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 resize-y ${borderClass} ${className}`}
                            {...(props as any)}
                        />
                    ) : (
                        <input
                            ref={ref as React.Ref<HTMLInputElement>}
                            type={type}
                            disabled={disabled}
                            style={{
                                paddingLeft: icon && iconPosition === "left" ? "2.75rem" : "1rem",
                                paddingRight: icon && iconPosition === "right" ? "2.75rem" : "1rem",
                                ...props.style,
                            }}
                            className={`w-full h-[52px] bg-slate-100 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 ${borderClass} ${className}`}
                            {...props}
                        />
                    )}

                    {icon && iconPosition === "right" && type !== "textarea" && (
                        <div className="absolute right-4 text-slate-400 flex items-center justify-center">
                            {icon}
                        </div>
                    )}
                </div>
                {error && (
                    <span className="text-xs text-red-500 font-medium px-1 mt-0.5">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
