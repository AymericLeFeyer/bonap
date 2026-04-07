/**
 * Composants partagés entre RecipeDetailPage (édition) et RecipeFormPage (création).
 * InlineEditText et InlineEditDuration — champs éditables inline WYSIWYG.
 */

import { useState, useRef, useEffect, type ReactNode } from "react"
import { Input } from "./ui/input.tsx"
import { formatDuration, formatMinutes } from "../../shared/utils/duration.ts"
import { cn } from "../../lib/utils.ts"

// ─── InlineEditText ───────────────────────────────────────────────────────────

export interface InlineEditTextProps {
  value: string
  displayValue?: ReactNode
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  multiline?: boolean
  rows?: number
  as?: "h1" | "p" | "span"
  disabled?: boolean
  autoFocus?: boolean
}

export function InlineEditText({
  value,
  displayValue,
  onChange,
  placeholder,
  className,
  inputClassName,
  multiline = false,
  rows = 3,
  as: Tag = "p",
  disabled = false,
  autoFocus = false,
}: InlineEditTextProps) {
  const [editing, setEditing] = useState(autoFocus)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus()
        const len = textareaRef.current.value.length
        textareaRef.current.setSelectionRange(len, len)
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus()
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(len, len)
      }
    }
  }, [editing, multiline])

  const sharedInputClass = cn(
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
    inputClassName,
  )

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(sharedInputClass, "resize-none", className)}
        />
      )
    }
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(sharedInputClass, className)}
      />
    )
  }

  return (
    <Tag
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        "cursor-text rounded-md px-1 -mx-1 transition-colors",
        !disabled && "hover:bg-muted/50",
        !value && "text-muted-foreground italic",
        className,
      )}
      title={disabled ? undefined : "Cliquer pour modifier"}
    >
      {displayValue ?? (value || placeholder)}
    </Tag>
  )
}

// ─── InlineEditDuration ───────────────────────────────────────────────────────

export interface InlineEditDurationProps {
  label: string
  value: string
  displayRaw?: string
  onChange: (v: string) => void
  disabled?: boolean
}

export function InlineEditDuration({ label, value, displayRaw, onChange, disabled }: InlineEditDurationProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <span className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground">{label} :</span>
        <Input
          ref={inputRef}
          type="number"
          min="0"
          step="5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          disabled={disabled}
          className="h-6 w-20 px-2 py-0 text-sm"
        />
        <span className="text-xs text-muted-foreground">min</span>
      </span>
    )
  }

  return (
    <span
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        "text-sm text-muted-foreground rounded px-1 -mx-1 transition-colors cursor-text",
        !disabled && "hover:bg-muted/50",
      )}
      title={disabled ? undefined : "Cliquer pour modifier"}
    >
      {label} : {displayRaw ? formatDuration(displayRaw) : (value ? formatMinutes(value) : "—")}
    </span>
  )
}
