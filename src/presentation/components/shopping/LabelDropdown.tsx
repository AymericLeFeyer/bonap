import { useState, useRef } from "react"
import { Tag, ChevronDown, Check } from "lucide-react"
import type { ShoppingLabel } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../../lib/utils.ts"
import { labelColor } from "./labelColor.ts"

interface LabelDropdownProps {
  labels: ShoppingLabel[]
  value: string | undefined
  onChange: (labelId: string | undefined) => void
  className?: string
}

export function LabelDropdown({ labels, value, onChange, className }: LabelDropdownProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedLabel = labels.find((l) => l.id === value)

  const handleSelect = (id: string | undefined) => {
    onChange(id)
    setOpen(false)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
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
    <div ref={ref} className={cn("relative shrink-0", className)} onBlur={handleBlur}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-6 items-center gap-1 rounded-full bg-muted px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        {selectedLabel ? (
          <>
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: labelColor(selectedLabel.name) }} />
            <span className="max-w-[80px] truncate">{selectedLabel.name}</span>
          </>
        ) : (
          <Tag className="h-3 w-3" />
        )}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 z-50 min-w-[130px] rounded-[var(--radius-xl)] border border-border/50 bg-card shadow-warm-md overflow-hidden",
          openUpward ? "bottom-full mb-1" : "top-full mt-1",
        )}>
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors"
          >
            <span className="h-2 w-2 rounded-full bg-border" />
            Sans étiquette
          </button>
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => handleSelect(l.id)}
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
