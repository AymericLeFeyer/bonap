import { useState, useRef, useEffect } from "react"
import {
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
  Sparkles,
} from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { useShopping } from "../hooks/useShopping.ts"
import { useCategorizeItems } from "../hooks/useCategorizeItems.ts"
import { RecipeDetailModal } from "../components/RecipeDetailModal.tsx"
import { recipeSlugStore } from "../../infrastructure/shopping/RecipeSlugStore.ts"
import { foodLabelStore } from "../../infrastructure/shopping/FoodLabelStore.ts"
import { getRecipesUseCase } from "../../infrastructure/container.ts"
import { extractFoodKey } from "../../shared/utils/food.ts"
import type { ShoppingItem, ShoppingLabel } from "../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../lib/utils.ts"
import { getEnv } from "../../shared/utils/env.ts"

// ─── Couleur déterministe par nom de catégorie ─────────────────────────────────

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function labelColor(name: string): string {
  const hue = hashStr(name) % 360
  return `oklch(0.62 0.14 ${hue})`
}

// ─── Label dropdown ────────────────────────────────────────────────────────────

interface LabelDropdownProps {
  labels: ShoppingLabel[]
  value: string | undefined
  onChange: (labelId: string | undefined) => void
  className?: string
}

function LabelDropdown({ labels, value, onChange, className }: LabelDropdownProps) {
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

// ─── Label select inline pour les formulaires ──────────────────────────────────

interface FormLabelSelectProps {
  labels: ShoppingLabel[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

function FormLabelSelect({ labels, value, onChange, disabled }: FormLabelSelectProps) {
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

// ─── Ligne article liste de courses ───────────────────────────────────────────

interface MealieItemRowProps {
  item: ShoppingItem
  labels: ShoppingLabel[]
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateQuantity: (item: ShoppingItem, qty: number) => void
  onUpdateNote: (item: ShoppingItem, note: string) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
  onViewRecipe?: (recipeName: string) => void
}

function MealieItemRow({ item, labels, onToggle, onDelete, onUpdateQuantity, onUpdateNote, onUpdateLabel, onViewRecipe }: MealieItemRowProps) {
  // For items added from planning, the note is "ingredient — RecipeName"
  const noteParts = item.note?.split(" — ") ?? []
  const displayName = item.foodName ?? (noteParts.length >= 2 ? noteParts[0] : item.note) ?? "Article sans nom"
  const recipeSuffix = noteParts.length >= 2 ? noteParts.slice(1).join(" — ") : null
  const recipeNamesFromNote = recipeSuffix ? [recipeSuffix] : []
  const allRecipeNames = item.recipeNames?.length ? item.recipeNames : recipeNamesFromNote
  const qty = item.quantity ?? 0

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(displayName)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditValue(displayName)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const saveEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== displayName) {
      const newNote = recipeSuffix ? `${trimmed} — ${recipeSuffix}` : trimmed
      onUpdateNote(item, newNote)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") setEditing(false)
  }

  return (
    <li className="flex min-h-[48px] items-center gap-3 border-b border-border/25 px-4 last:border-0 hover:bg-secondary/30 transition-colors group">
      {/* Checkbox custom */}
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.checked ? "Décocher" : "Cocher"}
        className={cn(
          "shrink-0 h-5 w-5 rounded-full border-2 transition-all flex items-center justify-center",
          item.checked
            ? "bg-primary border-primary"
            : "border-border hover:border-primary/50",
        )}
      >
        {item.checked && <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />}
      </button>

      {/* Quantité */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item, Math.max(0, qty - 1))}
          aria-label="Diminuer"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
        >
          <Minus className="h-3 w-3" />
        </button>
        {qty > 0 ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums font-semibold min-w-[1.5rem] text-center">
            {qty}
          </span>
        ) : (
          <span className="opacity-0 group-hover:opacity-100 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground transition-all min-w-[1.5rem] text-center">
            —
          </span>
        )}
        <button
          type="button"
          onClick={() => onUpdateQuantity(item, qty + 1)}
          aria-label="Augmenter"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Nom + recettes associées */}
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-primary"
        />
      ) : (
        <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span
            onDoubleClick={startEdit}
            className={cn(
              "text-sm font-medium leading-tight cursor-text",
              item.checked && "line-through opacity-40",
            )}
          >
            {displayName}
          </span>
          {allRecipeNames.map((recipeName) => (
            <button
              key={recipeName}
              type="button"
              onClick={(e) => { e.stopPropagation(); onViewRecipe?.(recipeName) }}
              className="text-[10px] text-muted-foreground/40 hover:text-primary transition-colors leading-tight"
            >
              {recipeName}
            </button>
          ))}
        </span>
      )}

      {/* Catégorie (toujours visible) + suppression (au survol) */}
      <div className="flex shrink-0 items-center gap-1">
        {!editing && labels.length > 0 && (
          <LabelDropdown
            labels={labels}
            value={item.label?.id}
            onChange={(labelId) => onUpdateLabel(item, labelId)}
          />
        )}
        {!editing && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label="Supprimer"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  )
}

// ─── Ligne article habituel ────────────────────────────────────────────────────

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
    <li className="flex min-h-[48px] items-center gap-3 border-b border-border/25 px-4 last:border-0 hover:bg-secondary/30 transition-colors group">
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
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 flex-1 text-sm rounded-xl"
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
              className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label="Supprimer"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </li>
  )
}

// ─── En-tête de groupe ─────────────────────────────────────────────────────────

interface GroupHeaderProps {
  label: string
  color?: string
  isFirst?: boolean
  onAiCategorize?: () => void
  aiCategorizeLoading?: boolean
}

function GroupHeader({ label, isFirst, onAiCategorize, aiCategorizeLoading }: GroupHeaderProps) {
  const isNone = label === "Sans étiquette"
  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-1.5 bg-secondary/50",
      isFirst && "rounded-t-[var(--radius-xl)]",
    )}>
      <span
        className="h-[7px] w-[7px] rounded-full shrink-0"
        style={{ backgroundColor: isNone ? "oklch(0.80 0.014 68)" : labelColor(label) }}
      />
      <span className="text-[9.5px] font-bold uppercase tracking-[0.10em] text-muted-foreground/60">
        {label}
      </span>
      {onAiCategorize && (
        <button
          type="button"
          onClick={onAiCategorize}
          disabled={aiCategorizeLoading}
          title="Catégoriser via IA"
          className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          {aiCategorizeLoading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <Sparkles className="h-3 w-3" />
          }
          IA
        </button>
      )}
    </div>
  )
}

// ─── Articles groupés par label ───────────────────────────────────────────────

interface GroupedItemsProps {
  items: ShoppingItem[]
  labels: ShoppingLabel[]
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateQuantity: (item: ShoppingItem, qty: number) => void
  onUpdateNote: (item: ShoppingItem, note: string) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
  onAiCategorize?: (uncategorizedItems: ShoppingItem[]) => void
  aiCategorizeLoading?: boolean
  onViewRecipe?: (recipeName: string) => void
}

function itemSortKey(item: ShoppingItem): string {
  const note = item.note?.split(" — ")[0] ?? ""
  return (item.foodName ?? note).toLowerCase()
}

function GroupedItems({ items, labels, onToggle, onDelete, onUpdateQuantity, onUpdateNote, onUpdateLabel, onAiCategorize, aiCategorizeLoading, onViewRecipe }: GroupedItemsProps) {
  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  const buildGroups = (list: ShoppingItem[]) => {
    const groups = new Map<string, { label: string; color?: string; items: ShoppingItem[] }>()
    for (const item of list) {
      const key = item.label?.id ?? "__none__"
      const labelName = item.label?.name ?? "Sans étiquette"
      if (!groups.has(key)) {
        groups.set(key, { label: labelName, color: item.label?.color, items: [] })
      }
      groups.get(key)!.items.push(item)
    }
    // Sort items alphabetically within each group
    for (const group of groups.values()) {
      group.items.sort((a, b) => itemSortKey(a).localeCompare(itemSortKey(b), "fr"))
    }
    const labelOrder = new Map(labels.map((l, i) => [l.id, i]))
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "__none__") return 1
      if (b === "__none__") return -1
      const ia = labelOrder.get(a) ?? Infinity
      const ib = labelOrder.get(b) ?? Infinity
      return ia - ib
    })
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Aucun article dans la liste
      </p>
    )
  }

  const uncheckedGroups = buildGroups(unchecked)
  const checkedGroups = buildGroups(checked)

  return (
    <div>
      {uncheckedGroups.map(([key, group]) => (
        <div key={key}>
          {uncheckedGroups.length > 1 && (
            <GroupHeader
              label={group.label}
              color={group.color}
              onAiCategorize={key === "__none__" && onAiCategorize ? () => onAiCategorize(group.items) : undefined}
              aiCategorizeLoading={key === "__none__" ? aiCategorizeLoading : undefined}
            />
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
                onUpdateNote={onUpdateNote}
                onUpdateLabel={onUpdateLabel}
                onViewRecipe={onViewRecipe}
              />
            ))}
          </ul>
        </div>
      ))}

      {checked.length > 0 && unchecked.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="h-px flex-1 bg-border/30" />
          <span className="text-xs font-medium text-muted-foreground/50">cochés</span>
          <div className="h-px flex-1 bg-border/30" />
        </div>
      )}

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
                onUpdateNote={onUpdateNote}
                onUpdateLabel={onUpdateLabel}
                onViewRecipe={onViewRecipe}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─── Habituels groupés ────────────────────────────────────────────────────────

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
    const labelName = item.label?.name ?? "Sans étiquette"
    if (!groups.has(key)) {
      groups.set(key, { label: labelName, color: item.label?.color, items: [] })
    }
    groups.get(key)!.items.push(item)
  }

  const labelOrder = new Map(labels.map((l, i) => [l.id, i]))
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === "__none__") return 1
    if (b === "__none__") return -1
    const ia = labelOrder.get(a) ?? Infinity
    const ib = labelOrder.get(b) ?? Infinity
    return ia - ib
  })

  if (sorted.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Aucun article habituel
      </p>
    )
  }

  return (
    <div>
      {sorted.map(([key, group], i) => (
        <div key={key}>
          {sorted.length > 1 && (
            <GroupHeader label={group.label} color={group.color} isFirst={i === 0} />
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
    updateItemNote,
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

  const { categorize: categorizeWithAI, loading: aiLoading, error: aiError } = useCategorizeItems()

  const [newItemNote, setNewItemNote] = useState("")
  const [newItemQty, setNewItemQty] = useState(1)
  const [newItemLabelId, setNewItemLabelId] = useState<string>("")
  const labelManuallySet = useRef(false)

  useEffect(() => {
    if (labelManuallySet.current) return
    const key = extractFoodKey(newItemNote)
    const saved = key ? foodLabelStore.lookup(key) : undefined
    setNewItemLabelId(saved ?? "")
  }, [newItemNote])
  const [newHabituelNote, setNewHabituelNote] = useState("")
  const [newHabituelLabelId, setNewHabituelLabelId] = useState<string>("")
  const [addingItem, setAddingItem] = useState(false)
  const [addingHabituel, setAddingHabituel] = useState(false)

  const [previewSlug, setPreviewSlug] = useState<string | null>(null)

  const handleViewRecipe = async (recipeName: string) => {
    // Try the slug store first (populated when adding from planning)
    let slug = recipeSlugStore.lookup(recipeName)
    if (!slug) {
      // Fallback: search Mealie by name
      const results = await getRecipesUseCase.execute(1, 5, { search: recipeName })
      const match = results.items.find((r) => r.name.toLowerCase() === recipeName.toLowerCase())
      if (match) {
        slug = match.slug
        recipeSlugStore.set(recipeName, slug)
      }
    }
    if (slug) setPreviewSlug(slug)
  }

  const handleAiCategorize = async (uncategorizedItems: ShoppingItem[]) => {
    await categorizeWithAI(uncategorizedItems, labels, updateItemLabel)
  }
  const newItemInputRef = useRef<HTMLInputElement>(null)
  const newHabituelInputRef = useRef<HTMLInputElement>(null)

  const checkedCount = items.filter((i) => i.checked).length
  const totalCount = items.length
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

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
      labelManuallySet.current = false
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
    <div className="flex flex-col gap-6 pb-8">
      {/* ── En-tête ── */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-7 bg-background/95 px-4 md:px-7 pb-3 pt-5 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold">Liste de courses</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]",
                "text-muted-foreground hover:text-foreground hover:bg-secondary",
                "transition-colors disabled:opacity-50",
              )}
              aria-label="Rafraîchir"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <a
              href={`${getEnv("VITE_MEALIE_URL").replace(/\/+$/, "")}/group/data/labels`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--radius-lg)]",
                "border border-border bg-card px-2.5 py-1.5",
                "text-xs font-semibold text-muted-foreground",
                "shadow-subtle hover:bg-secondary hover:text-foreground",
                "transition-all duration-150",
              )}
              title="Gérer les étiquettes"
            >
              <Tag className="h-3.5 w-3.5" />
              Étiquettes
            </a>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {(error || aiError) && (
        <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error ?? aiError}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
          {/* ── Prochaines courses ── */}
          <section className="flex flex-col lg:w-[60%]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Prochaines courses</h2>
                {totalCount > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {checkedCount}/{totalCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {checkedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void clearList("checked")}
                    className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Vider cochés
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void clearList("all")}
                    className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Tout vider
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle">
              {/* Barre de progression */}
              {totalCount > 0 && (
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{progressPct}% complété</span>
                    <span className="text-xs text-muted-foreground">{checkedCount}/{totalCount}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              <GroupedItems
                items={items}
                labels={labels}
                onToggle={(item) => void toggleItem(item)}
                onDelete={(id) => void deleteItem(id)}
                onUpdateQuantity={(item, qty) => void updateItemQuantity(item, qty)}
                onUpdateNote={(item, note) => void updateItemNote(item, note)}
                onUpdateLabel={(item, labelId) => void updateItemLabel(item, labelId)}
                onAiCategorize={labels.length > 0 ? (uncategorized) => void handleAiCategorize(uncategorized) : undefined}
                aiCategorizeLoading={aiLoading}
                onViewRecipe={(name) => void handleViewRecipe(name)}
              />

              {/* Formulaire d'ajout */}
              <div className="border-t border-border/40 bg-secondary/20 p-3 rounded-b-[var(--radius-2xl)]">
                <form onSubmit={(e) => void handleAddItem(e)} className="flex gap-2">
                  <div className="flex shrink-0 items-center rounded-[var(--radius-lg)] border border-input bg-card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNewItemQty((q) => Math.max(1, q - 1))}
                      className="flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Diminuer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums font-semibold">{newItemQty}</span>
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
                      onChange={(v) => { labelManuallySet.current = true; setNewItemLabelId(v) }}
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

          {/* ── Articles habituels ── */}
          <section className="flex flex-col lg:w-[40%]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Habituels</h2>
                {habituelsItems.length > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {habituelsItems.length}
                  </span>
                )}
              </div>
              {habituelsItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => void deleteAllHabituels()}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                >
                  Tout supprimer
                </button>
              )}
            </div>

            <div className="rounded-[var(--radius-2xl)] border border-border/50 bg-card shadow-subtle">
              <GroupedHabituels
                items={habituelsItems}
                cartItems={items}
                labels={labels}
                onAddToCart={(i) => void addHabituelToCart(i)}
                onDelete={(id) => void deleteHabituel(id)}
                onUpdateNote={(i, note) => void updateHabituelNote(i, note)}
                onUpdateLabel={(i, labelId) => void updateHabituelLabel(i, labelId)}
              />

              {/* Formulaire d'ajout habituel */}
              <div className="border-t border-border/40 bg-secondary/20 p-3 rounded-b-[var(--radius-2xl)]">
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

      <RecipeDetailModal
        slug={previewSlug}
        onOpenChange={(open) => { if (!open) setPreviewSlug(null) }}
      />
    </div>
  )
}
