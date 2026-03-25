import { useState, useRef, useEffect, useId } from "react"
import { createPortal } from "react-dom"
import { cn } from "../../../lib/utils.ts"

export interface AutocompleteOption {
  id: string
  label: string
}

interface AutocompleteProps {
  value: string
  onChange: (value: string, option?: AutocompleteOption) => void
  options: AutocompleteOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Afficher une option "Créer …" quand la valeur ne correspond à aucun item */
  allowCreate?: boolean
  createLabel?: (value: string) => string
  "aria-label"?: string
}

export function Autocomplete({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  allowCreate = false,
  createLabel = (v) => `Créer "${v}"`,
  "aria-label": ariaLabel,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const id = useId()

  const trimmed = value.trim().toLowerCase()

  const filtered = trimmed
    ? options.filter((o) => o.label.toLowerCase().includes(trimmed))
    : options

  const exactMatch = options.some((o) => o.label.toLowerCase() === trimmed)
  const showCreate = allowCreate && trimmed.length > 0 && !exactMatch

  const allItems = showCreate
    ? [...filtered, { id: "__create__", label: createLabel(value.trim()) }]
    : filtered

  const visibleItems = allItems.slice(0, 20)

  useEffect(() => {
    setHighlighted(-1)
  }, [value])

  // Recalcule la position du dropdown à l'ouverture et à chaque scroll/resize
  useEffect(() => {
    if (!open) return

    const update = () => {
      if (!inputRef.current) return
      const rect = inputRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = 192 // max-h-48 = 12rem = 192px
      const showAbove = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight
      setDropdownStyle({
        position: "fixed",
        top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }

    update()
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open])

  const selectItem = (item: AutocompleteOption) => {
    if (item.id === "__create__") {
      onChange(value.trim())
    } else {
      onChange(item.label, item)
    }
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true)
        return
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, visibleItems.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (highlighted >= 0 && visibleItems[highlighted]) {
        selectItem(visibleItems[highlighted])
      } else {
        setOpen(false)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [highlighted])

  const dropdown = open && visibleItems.length > 0 ? (
    <ul
      ref={listRef}
      id={`${id}-list`}
      role="listbox"
      style={dropdownStyle}
      className={cn(
        "max-h-48 overflow-auto rounded-md border border-border",
        "bg-popover text-popover-foreground shadow-md",
      )}
    >
      {visibleItems.map((item, i) => (
        <li
          key={item.id}
          role="option"
          aria-selected={i === highlighted}
          onMouseDown={(e) => {
            e.preventDefault()
            selectItem(item)
          }}
          onMouseEnter={() => setHighlighted(i)}
          className={cn(
            "cursor-pointer px-3 py-2 text-sm",
            i === highlighted ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
            item.id === "__create__" && "italic text-muted-foreground",
          )}
        >
          {item.label}
        </li>
      ))}
    </ul>
  ) : null

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay to allow click on list item
          setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        autoComplete="off"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      {dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
