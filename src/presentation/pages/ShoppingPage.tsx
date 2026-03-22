import { useState, useRef } from "react"
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Pencil,
  X,
  Check,
  ArrowUp,
  Tag,
  ChevronDown,
  Clock,
} from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { useShopping } from "../hooks/useShopping.ts"
import type { ShoppingItem, ShoppingLabel } from "../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../lib/utils.ts"

// ─── Label dropdown (replaces native <select>) ────────────────────────────────

interface LabelDropdownProps {
  labels: ShoppingLabel[]
  value: string | undefined
  onChange: (labelId: string | undefined) => void
  className?: string
}

function LabelDropdown({ labels, value, onChange, className }: LabelDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedLabel = labels.find((l) => l.id === value)

  const handleSelect = (id: string | undefined) => {
    onChange(id)
    setOpen(false)
  }

  // Close on outside click
  const handleBlur = (e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className={cn("relative shrink-0", className)} onBlur={handleBlur}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}
        className="flex h-6 items-center gap-1 rounded-full bg-muted px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {selectedLabel ? (
          <>
            {selectedLabel.color && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: selectedLabel.color }}
              />
            )}
            <span className="max-w-[80px] truncate">{selectedLabel.name}</span>
          </>
        ) : (
          <Tag className="h-3 w-3" />
        )}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[130px] rounded-lg border border-border bg-popover shadow-md">
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors rounded-t-lg"
          >
            <span className="h-2 w-2 rounded-full bg-border" />
            Sans catégorie
          </button>
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => handleSelect(l.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors last:rounded-b-lg"
            >
              {l.color ? (
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              ) : (
                <span className="h-2 w-2 rounded-full bg-border" />
              )}
              <span className="truncate">{l.name}</span>
              {l.id === value && <Check className="ml-auto h-3 w-3 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Inline label select for forms ────────────────────────────────────────────

interface FormLabelSelectProps {
  labels: ShoppingLabel[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

function FormLabelSelect({ labels, value, onChange, disabled }: FormLabelSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = labels.find((l) => l.id === value)

  const handleBlur = (e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative shrink-0" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      >
        {selected ? (
          <>
            {selected.color && (
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
            )}
            <span className="max-w-[80px] truncate">{selected.name}</span>
          </>
        ) : (
          <span>Catégorie</span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-border bg-popover shadow-md">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false) }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors rounded-t-lg"
          >
            <span className="h-2 w-2 rounded-full bg-border" />
            Catégorie
          </button>
          {labels.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => { onChange(l.id); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors last:rounded-b-lg"
            >
              {l.color ? (
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              ) : (
                <span className="h-2 w-2 rounded-full bg-border" />
              )}
              <span className="truncate">{l.name}</span>
              {l.id === value && <Check className="ml-auto h-3 w-3 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Mealie item component ─────────────────────────────────────────────────────

interface MealieItemRowProps {
  item: ShoppingItem
  labels: ShoppingLabel[]
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateQuantity: (item: ShoppingItem, qty: number) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
}

function MealieItemRow({ item, labels, onToggle, onDelete, onUpdateQuantity, onUpdateLabel }: MealieItemRowProps) {
  const name = item.foodName ?? item.note ?? "Article sans nom"
  const qty = item.quantity ?? 0

  return (
    <li className="flex min-h-[44px] items-center gap-2.5 border-b border-border/30 px-3 last:border-0 hover:bg-muted/30 transition-colors group">
      {/* Custom checkbox */}
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.checked ? "Décocher" : "Cocher"}
        className={cn(
          "shrink-0 h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
          item.checked
            ? "bg-primary border-primary"
            : "border-border hover:border-primary/60",
        )}
      >
        {item.checked && <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />}
      </button>

      {/* Name + recipe references */}
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm font-medium leading-tight",
            item.checked && "line-through opacity-40",
          )}
        >
          {name}
        </span>
        {item.recipeNames && item.recipeNames.length > 0 && (
          <span className="block text-xs text-muted-foreground/70 italic">
            {item.recipeNames.join(", ")}
          </span>
        )}
      </span>

      {/* Quantity badge */}
      {qty > 0 && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item, Math.max(0, qty - 1))}
            aria-label="Diminuer"
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums font-medium">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item, qty + 1)}
            aria-label="Augmenter"
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
      {qty === 0 && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item, Math.max(0, qty - 1))}
            aria-label="Diminuer"
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="opacity-0 group-hover:opacity-100 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground transition-all">
            —
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item, qty + 1)}
            aria-label="Augmenter"
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Actions (hover only) */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {labels.length > 0 && (
          <LabelDropdown
            labels={labels}
            value={item.label?.id}
            onChange={(labelId) => onUpdateLabel(item, labelId)}
          />
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          aria-label="Supprimer"
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}

// ─── Habituel item component ───────────────────────────────────────────────────

interface HabituelItemRowProps {
  item: ShoppingItem
  labels: ShoppingLabel[]
  cartItems: ShoppingItem[]
  onAddToCart: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateNote: (item: ShoppingItem, note: string) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
}

function HabituelItemRow({ item, labels, cartItems, onAddToCart, onDelete, onUpdateNote, onUpdateLabel }: HabituelItemRowProps) {
  const alreadyInCart = cartItems.some(
    (i) => i.note?.toLowerCase() === item.note?.toLowerCase() && !i.checked,
  )
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.note ?? "")
  const inputRef = useRef<HTMLInputElement>(null)

  const name = item.note ?? "Article sans nom"

  const handleEdit = () => {
    setEditValue(item.note ?? "")
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed) {
      onUpdateNote(item, trimmed)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") setEditing(false)
  }

  return (
    <li className="flex min-h-[44px] items-center gap-2.5 border-b border-border/30 px-3 last:border-0 hover:bg-muted/30 transition-colors group">
      {/* Add to cart — always visible */}
      {!editing && (
        <button
          type="button"
          onClick={() => !alreadyInCart && onAddToCart(item)}
          aria-label="Ajouter aux prochaines courses"
          title={alreadyInCart ? "Déjà dans les prochaines courses" : "Ajouter aux prochaines courses"}
          disabled={alreadyInCart}
          className={cn(
            "shrink-0 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
            alreadyInCart
              ? "border-primary/30 bg-primary/10 cursor-default"
              : "border-border hover:border-primary hover:bg-primary/5",
          )}
        >
          {alreadyInCart ? (
            <Check className="h-3 w-3 text-primary" />
          ) : (
            <ArrowUp className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </button>
      )}

      {editing ? (
        <div className="flex flex-1 items-center gap-1">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 flex-1 text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium leading-tight">{name}</span>

          <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {labels.length > 0 && (
              <LabelDropdown
                labels={labels}
                value={item.label?.id}
                onChange={(labelId) => onUpdateLabel(item, labelId)}
              />
            )}
            <button
              type="button"
              onClick={handleEdit}
              aria-label="Modifier"
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label="Supprimer"
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </li>
  )
}

// ─── Group header ─────────────────────────────────────────────────────────────

interface GroupHeaderProps {
  label: string
  color?: string
}

function GroupHeader({ label, color }: GroupHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      {color ? (
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      ) : (
        <span className="h-2 w-2 rounded-full bg-border shrink-0" />
      )}
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

// ─── Items section grouped by label ──────────────────────────────────────────

interface GroupedItemsProps {
  items: ShoppingItem[]
  labels: ShoppingLabel[]
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateQuantity: (item: ShoppingItem, qty: number) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
}

function GroupedItems({ items, labels, onToggle, onDelete, onUpdateQuantity, onUpdateLabel }: GroupedItemsProps) {
  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  const buildGroups = (list: ShoppingItem[]) => {
    const groups = new Map<string, { label: string; color?: string; items: ShoppingItem[] }>()
    for (const item of list) {
      const key = item.label?.id ?? "__none__"
      const labelName = item.label?.name ?? "Sans catégorie"
      if (!groups.has(key)) {
        groups.set(key, { label: labelName, color: item.label?.color, items: [] })
      }
      groups.get(key)!.items.push(item)
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "__none__") return 1
      if (b === "__none__") return -1
      return 0
    })
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun article dans la liste
      </p>
    )
  }

  const uncheckedGroups = buildGroups(unchecked)
  const checkedGroups = buildGroups(checked)

  return (
    <div>
      {/* Unchecked items */}
      {uncheckedGroups.map(([key, group]) => (
        <div key={key}>
          {uncheckedGroups.length > 1 && (
            <GroupHeader label={group.label} color={group.color} />
          )}
          <ul>
            {group.items.map((item) => (
              <MealieItemRow
                key={item.id}
                item={item}
                labels={labels}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateLabel={onUpdateLabel}
              />
            ))}
          </ul>
        </div>
      ))}

      {/* Checked separator */}
      {checked.length > 0 && unchecked.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="h-px flex-1 bg-border/40" />
          <span className="text-xs text-muted-foreground/50">cochés</span>
          <div className="h-px flex-1 bg-border/40" />
        </div>
      )}

      {/* Checked items */}
      {checkedGroups.map(([key, group]) => (
        <div key={key}>
          {checkedGroups.length > 1 && (
            <GroupHeader label={group.label} color={group.color} />
          )}
          <ul>
            {group.items.map((item) => (
              <MealieItemRow
                key={item.id}
                item={item}
                labels={labels}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdateQuantity={onUpdateQuantity}
                onUpdateLabel={onUpdateLabel}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─── Grouped habituels ────────────────────────────────────────────────────────

interface GroupedHabituelsProps {
  items: ShoppingItem[]
  cartItems: ShoppingItem[]
  labels: ShoppingLabel[]
  onAddToCart: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateNote: (item: ShoppingItem, note: string) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
}

function GroupedHabituels({ items, cartItems, labels, onAddToCart, onDelete, onUpdateNote, onUpdateLabel }: GroupedHabituelsProps) {
  const groups = new Map<string, { label: string; color?: string; items: ShoppingItem[] }>()

  for (const item of items) {
    const key = item.label?.id ?? "__none__"
    const labelName = item.label?.name ?? "Sans catégorie"
    if (!groups.has(key)) {
      groups.set(key, { label: labelName, color: item.label?.color, items: [] })
    }
    groups.get(key)!.items.push(item)
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === "__none__") return 1
    if (b === "__none__") return -1
    return 0
  })

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun article habituel
      </p>
    )
  }

  return (
    <div>
      {sorted.map(([key, group]) => (
        <div key={key}>
          {sorted.length > 1 && (
            <GroupHeader label={group.label} color={group.color} />
          )}
          <ul>
            {group.items.map((item) => (
              <HabituelItemRow
                key={item.id}
                item={item}
                labels={labels}
                cartItems={cartItems}
                onAddToCart={onAddToCart}
                onDelete={onDelete}
                onUpdateNote={onUpdateNote}
                onUpdateLabel={onUpdateLabel}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─── ShoppingPage ──────────────────────────────────────────────────────────────

export function ShoppingPage() {
  const {
    items,
    labels,
    habituelsItems,
    loading,
    error,
    addItem,
    toggleItem,
    updateItemQuantity,
    updateItemLabel,
    deleteItem,
    clearList,
    addHabituel,
    deleteHabituel,
    updateHabituelLabel,
    updateHabituelNote,
    addHabituelToCart,
    deleteAllHabituels,
    reload,
  } = useShopping()

  const [newItemNote, setNewItemNote] = useState("")
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemLabelId, setNewItemLabelId] = useState<string>("")
  const [newHabituelNote, setNewHabituelNote] = useState("")
  const [newHabituelLabelId, setNewHabituelLabelId] = useState<string>("")
  const [addingItem, setAddingItem] = useState(false)
  const [addingHabituel, setAddingHabituel] = useState(false)
  const newItemInputRef = useRef<HTMLInputElement>(null)
  const newHabituelInputRef = useRef<HTMLInputElement>(null)

  const checkedCount = items.filter((i) => i.checked).length
  const totalCount = items.length

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const note = newItemNote.trim()
    if (!note) return
    setAddingItem(true)
    try {
      await addItem(note, newItemQty, newItemLabelId || undefined)
      setNewItemNote("")
      setNewItemQty(1)
      setNewItemLabelId("")
    } finally {
      setAddingItem(false)
      setTimeout(() => newItemInputRef.current?.focus(), 0)
    }
  }

  const handleAddHabituel = async (e: React.FormEvent) => {
    e.preventDefault()
    const note = newHabituelNote.trim()
    if (!note) return
    setAddingHabituel(true)
    try {
      await addHabituel(note, newHabituelLabelId || undefined)
      setNewHabituelNote("")
      setNewHabituelLabelId("")
    } finally {
      setAddingHabituel(false)
      setTimeout(() => newHabituelInputRef.current?.focus(), 0)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-8 md:px-6">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-4 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Liste de courses</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Rafraîchir"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <a
              href={`${(import.meta.env.VITE_MEALIE_URL as string ?? "").replace(/\/+$/, "")}/group/data/labels`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
              title="Gérer les catégories"
            >
              <Tag className="h-3.5 w-3.5" />
              Catégories
            </a>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
          {/* ── Prochaines courses (60%) ── */}
          <section className="flex flex-col lg:w-[60%]">
            {/* Section title */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Prochaines courses</h2>
                {totalCount > 0 && (
                  <span className="text-sm text-muted-foreground">({totalCount})</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {checkedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void clearList("checked")}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Vider cochés ({checkedCount})
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void clearList("all")}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Tout vider
                  </button>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="rounded-xl border border-border/60">
              <GroupedItems
                items={items}
                labels={labels}
                onToggle={(item) => void toggleItem(item)}
                onDelete={(id) => void deleteItem(id)}
                onUpdateQuantity={(item, qty) => void updateItemQuantity(item, qty)}
                onUpdateLabel={(item, labelId) => void updateItemLabel(item, labelId)}
              />

              {/* Add item form */}
              <div className="border-t border-border/60 p-2.5">
                <form onSubmit={(e) => void handleAddItem(e)} className="flex gap-2">
                  <div className="flex shrink-0 items-center rounded-md border border-input bg-background">
                    <button
                      type="button"
                      onClick={() => setNewItemQty((q) => Math.max(1, q - 1))}
                      className="flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Diminuer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{newItemQty}</span>
                    <button
                      type="button"
                      onClick={() => setNewItemQty((q) => q + 1)}
                      className="flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Augmenter"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <Input
                    ref={newItemInputRef}
                    value={newItemNote}
                    onChange={(e) => setNewItemNote(e.target.value)}
                    placeholder="Ajouter un article..."
                    className="h-8 min-w-0 flex-1 text-sm"
                    disabled={addingItem}
                  />
                  {labels.length > 0 && (
                    <FormLabelSelect
                      labels={labels}
                      value={newItemLabelId}
                      onChange={setNewItemLabelId}
                      disabled={addingItem}
                    />
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={addingItem || !newItemNote.trim()}
                  >
                    {addingItem ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </section>

          {/* ── Articles habituels (40%) ── */}
          <section className="flex flex-col lg:w-[40%]">
            {/* Section title */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Habituels</h2>
                {habituelsItems.length > 0 && (
                  <span className="text-sm text-muted-foreground">({habituelsItems.length})</span>
                )}
              </div>
              {habituelsItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => void deleteAllHabituels()}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Tout supprimer
                </button>
              )}
            </div>

            {/* Items */}
            <div className="rounded-xl border border-border/60">
              <GroupedHabituels
                items={habituelsItems}
                cartItems={items}
                labels={labels}
                onAddToCart={(i) => void addHabituelToCart(i)}
                onDelete={(id) => void deleteHabituel(id)}
                onUpdateNote={(i, note) => void updateHabituelNote(i, note)}
                onUpdateLabel={(i, labelId) => void updateHabituelLabel(i, labelId)}
              />

              {/* Add habituel form */}
              <div className="border-t border-border/60 p-2.5">
                <form onSubmit={(e) => void handleAddHabituel(e)} className="flex gap-2">
                  <Input
                    ref={newHabituelInputRef}
                    value={newHabituelNote}
                    onChange={(e) => setNewHabituelNote(e.target.value)}
                    placeholder="Ajouter un habituel..."
                    className="h-8 flex-1 text-sm"
                    disabled={addingHabituel}
                  />
                  {labels.length > 0 && (
                    <FormLabelSelect
                      labels={labels}
                      value={newHabituelLabelId}
                      onChange={setNewHabituelLabelId}
                      disabled={addingHabituel}
                    />
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={addingHabituel || !newHabituelNote.trim()}
                  >
                    {addingHabituel ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
