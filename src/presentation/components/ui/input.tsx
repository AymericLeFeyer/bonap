import * as React from "react"

import { cn } from "../../../lib/utils.ts"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* Layout */
          "flex h-9 w-full",
          /* Shape */
          "rounded-[var(--radius-lg)] border border-input",
          /* Background */
          "bg-card",
          /* Padding */
          "px-3.5 py-2",
          /* Typography */
          "text-sm text-foreground placeholder:text-muted-foreground/60",
          /* Shadow inset subtil */
          "shadow-[inset_0_1px_2px_oklch(0_0_0/0.04)]",
          /* Transitions */
          "transition-[border-color,box-shadow] duration-150",
          /* Focus */
          "focus-visible:outline-none",
          "focus-visible:border-primary/60",
          "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0",
          /* File */
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          /* Disabled */
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
