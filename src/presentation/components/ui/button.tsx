/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../../lib/utils.ts"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-semibold tracking-[-0.01em]",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        /* Bouton principal : terracotta solide avec ombre warm */
        default: [
          "bg-primary text-primary-foreground",
          "shadow-[0_1px_3px_oklch(0.58_0.175_38/0.25),0_1px_2px_oklch(0_0_0/0.06)]",
          "hover:bg-primary/93 hover:shadow-[0_2px_8px_oklch(0.58_0.175_38/0.30),0_1px_3px_oklch(0_0_0/0.08)]",
          "active:scale-[0.98] active:shadow-none",
        ].join(" "),
        /* Destructive */
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-[0_1px_3px_oklch(0.56_0.230_25/0.20)]",
          "hover:bg-destructive/90",
          "active:scale-[0.98]",
        ].join(" "),
        /* Outline : bordure visible, fond transparent */
        outline: [
          "border border-border bg-card text-foreground",
          "shadow-subtle",
          "hover:bg-secondary hover:border-border",
          "active:scale-[0.98]",
        ].join(" "),
        /* Secondary : fond secondaire beige */
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/70",
          "active:scale-[0.98]",
        ].join(" "),
        /* Ghost : transparent, fond au hover */
        ghost: [
          "text-foreground",
          "hover:bg-secondary hover:text-foreground",
          "active:scale-[0.98]",
        ].join(" "),
        /* Link : texte souligné */
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-9 rounded-[var(--radius-lg)] px-4 py-2",
        sm: "h-8 rounded-[var(--radius-md)] px-3 py-1.5 text-xs",
        lg: "h-11 rounded-[var(--radius-xl)] px-6 py-2.5 text-base",
        icon: "h-9 w-9 rounded-[var(--radius-lg)]",
        "icon-sm": "h-8 w-8 rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
