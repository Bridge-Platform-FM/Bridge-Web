import React from "react";
import { Loader } from "../common/loader";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  size?: "small" | "medium" | "full";
  isDisabled?: boolean;
  loading?: boolean;
}

export function Button({
  text,
  size = "medium",
  isDisabled = false,
  loading = false,
  className = "",
  ...props
}: ButtonProps) {

  let sizeClass = "";
  if (size === "small") {
    sizeClass = "btn-small";
  } else if (size === "full") {
    sizeClass = "btn-full";
  } else {
    sizeClass = "btn-medium";
  }


  return (
    <button
      disabled={isDisabled || loading}
      className={`flex items-center justify-center gap-5 rounded-md font-medium ${sizeClass} ${className}`}
      {...props}
    >
      {loading && <Loader size="small" />}
      <span>{text}</span>
    </button>
  );
}
