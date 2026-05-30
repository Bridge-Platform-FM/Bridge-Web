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
            ? "focus:ring-4 focus:ring-error/10 border border-error bg-error-container/5 text-on-surface"
            : "focus:ring-4 focus:ring-primary/10 border border-transparent focus:border-primary/40 focus:bg-surface-container-lowest text-on-surface";

        if (type === "checkbox" || type === "radio") {
            return (
                <div className="flex flex-col gap-1.5 w-fit">
                    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? "opacity-60 pointer-events-none" : ""} ${className}`}>
                        <input
                            ref={ref as React.Ref<HTMLInputElement>}
                            type={type}
                            disabled={disabled}
                            className={`w-4 h-4 cursor-pointer accent-primary transition-all ${error ? "outline outline-1 outline-error outline-offset-1" : ""}`}
                            {...props}
                        />
                        {label && (
                            <span className={`text-sm font-medium select-none ${error ? "text-error" : "text-on-surface"}`}>
                                {label}
                            </span>
                        )}
                    </label>
                    {error && (
                        <span className="text-xs text-error font-medium px-1 mt-0.5">
                            {error}
                        </span>
                    )}
                </div>
            );
        }

        return (
            <div className={`flex flex-col gap-1.5 w-full ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
                {label && (
                    <label className="text-[11px] font-bold text-on-surface-variant tracking-wide px-1 uppercase select-none">
                        {label}
                    </label>
                )}
                <div className="relative w-full flex items-center">
                    {icon && iconPosition === "left" && type !== "textarea" && (
                        <div className="absolute left-4 text-on-surface-variant flex items-center justify-center pointer-events-none">
                            {icon}
                        </div>
                    )}

                    {type === "textarea" ? (
                        <textarea
                            ref={ref as React.Ref<HTMLTextAreaElement>}
                            disabled={disabled}
                            rows={rows}
                            className={`w-full min-h-[100px] p-4 bg-surface-container rounded-xl text-sm outline-none transition-all placeholder:text-outline-variant resize-y ${borderClass} ${className}`}
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
                            className={`w-full h-[52px] bg-surface-container rounded-xl text-sm outline-none transition-all placeholder:text-outline-variant ${borderClass} ${className}`}
                            {...props}
                        />
                    )}

                    {icon && iconPosition === "right" && type !== "textarea" && (
                        <div className="absolute right-4 text-on-surface-variant flex items-center justify-center pointer-events-none">
                            {icon}
                        </div>
                    )}
                </div>
                {error && (
                    <span className="text-xs text-error font-medium px-1 mt-0.5">
                        {error}
                    </span>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
