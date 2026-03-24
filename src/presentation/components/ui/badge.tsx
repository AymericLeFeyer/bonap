/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../../lib/utils.ts"

const badgeVariants = cva(
  [
    "inline-flex items-center rounded-full",
    "px-2.5 py-0.5",
    "text-xs font-semibold tracking-[-0.01em]",
    "transition-colors duration-150",
    "select-none cursor-default",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Active / sélectionné — terracotta */
        default: [
          "border border-transparent",
          "bg-primary text-primary-foreground",
          "shadow-[0_1px_2px_oklch(0.58_0.175_38/0.20)]",
          "hover:bg-primary/88",
        ].join(" "),
        /* Secondaire — beige chaud */
        secondary: [
          "border border-transparent",
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/70",
        ].join(" "),
        /* Outline — bordure subtile, fond transparent */
        outline: [
          "border border-border",
          "bg-transparent text-muted-foreground",
          "hover:bg-secondary hover:text-foreground hover:border-border",
        ].join(" "),
        /* Destructive */
        destructive: [
          "border border-transparent",
          "bg-destructive/10 text-destructive",
          "border-destructive/20",
          "hover:bg-destructive/15",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
