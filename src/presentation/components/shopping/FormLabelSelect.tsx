import { useState, useRef } from "react"
import { ChevronDown, Check } from "lucide-react"
import type { ShoppingLabel } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../../lib/utils.ts"
import { labelColor } from "./labelColor.ts"

interface FormLabelSelectProps {
  labels: ShoppingLabel[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

export function FormLabelSelect({ labels, value, onChange, disabled }: FormLabelSelectProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = labels.find((l) => l.id === value)

  const handleToggle = () => {
    if (disabled) return
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setOpenUpward(rect.bottom + 220 > window.innerHeight)
    }
    setOpen((p) => !p)
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative shrink-0" onBlur={handleBlur}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex h-8 items-center gap-1.5 rounded-[var(--radius-lg)] border border-input bg-card px-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
      >
        {selected ? (
          <>
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: labelColor(selected.name) }} />
            <span className="max-w-[80px] truncate">{selected.name}</span>
          </>
        ) : (
          <span>Étiquette</span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className={cn(
          "absolute left-0 z-50 min-w-[140px] rounded-[var(--radius-xl)] border border-border/50 bg-card shadow-warm-md overflow-hidden",
          openUpward ? "bottom-full mb-1" : "top-full mt-1",
        )}>
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-border" />
            Étiquette
          </button>
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { onChange(l.id); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors border-t border-border/30"
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: labelColor(l.name) }} />
              <span className="truncate">{l.name}</span>
              {l.id === value && <Check className="ml-auto h-3 w-3 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
