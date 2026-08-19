/**
 * Composants partagés entre RecipeDetailPage (édition) et RecipeFormPage (création).
 * InlineEditText et InlineEditDuration — champs éditables inline WYSIWYG.
 */

import { useState, useRef, useEffect, type ReactNode } from "react"
import { Minus, Plus } from "lucide-react"
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

// ─── InlineEditServings ────────────────────────────────────────────────────────

export interface InlineEditServingsProps {
  /** Numeric value as a string (kept as string to match the existing form data shape). */
  value: string
  baseServings?: number
  onChange: (v: string) => void
  disabled?: boolean
  min?: number
  max?: number
}

/**
 * +/- stepper for recipe servings (style Mealie post-PR #4298).
 * Increments by 1, clamped to [min, max], shows a "Nx" multiplier
 * when the current value differs from the recipe base.
 */
export function InlineEditServings({
  value,
  baseServings,
  onChange,
  disabled,
  min = 1,
  max = 99,
}: InlineEditServingsProps) {
  const current = Math.max(0, parseInt(value, 10) || 0)
  const clamp = (n: number) => Math.min(Math.max(n, min), max)
  const update = (next: number) => onChange(String(clamp(next)))

  const ratio = baseServings && baseServings > 0 && current > 0
    ? current / baseServings
    : undefined

  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Portions :</span>
      <span className="inline-flex items-center rounded-md border border-input bg-background overflow-hidden">
        <button
          type="button"
          onClick={() => update(current - 1)}
          disabled={disabled || current <= min}
          aria-label="Diminuer le nombre de portions"
          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={current || ""}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === "") onChange("")
            else update(parseInt(raw, 10))
          }}
          disabled={disabled}
          aria-label="Nombre de portions"
          className="h-7 w-10 border-0 bg-transparent text-center text-sm tabular-nums font-semibold focus:outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => update(current + 1)}
          disabled={disabled || current >= max}
          aria-label="Augmenter le nombre de portions"
          className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </span>
      {ratio && ratio !== 1 && (
        <span className="text-xs text-muted-foreground tabular-nums" title={`Recette de base : ${baseServings} portions`}>
          {ratio % 1 === 0 ? `${ratio}×` : `${(Math.round(ratio * 100) / 100)}×`}
        </span>
      )}
    </span>
  )
}
