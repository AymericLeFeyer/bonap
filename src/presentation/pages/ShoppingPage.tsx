import { useState, useRef } from "react"
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  Pencil,
  X,
  Check,
  ArrowUp,
  Tag,
} from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { useShopping } from "../hooks/useShopping.ts"
import type { ShoppingItem, ShoppingLabel } from "../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../lib/utils.ts"

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
  const name = item.note ?? item.foodName ?? "Article sans nom"
  const qty = item.quantity ?? 0

  return (
    <li className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors group">
      {/* Checkbox — far left */}
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.checked ? "Décocher" : "Cocher"}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
      >
        {item.checked ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>

      {/* Quantity controls */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item, Math.max(0, qty - 1))}
          aria-label="Diminuer"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className={cn("min-w-[1.5rem] text-center text-xs tabular-nums", qty === 0 ? "text-muted-foreground" : "font-medium")}>
          {qty > 0 ? qty : "—"}
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

      {/* Name + recipe references */}
      <span className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm leading-tight",
            item.checked && "line-through text-muted-foreground",
          )}
        >
          {name}
        </span>
        {item.recipeNames && item.recipeNames.length > 0 && (
          <span className="block text-xs text-muted-foreground">
            {item.recipeNames.join(", ")}
          </span>
        )}
      </span>

      {/* Category selector — far right */}
      {labels.length > 0 && (
        <select
          value={item.label?.id ?? ""}
          onChange={(e) => onUpdateLabel(item, e.target.value || undefined)}
          onClick={(e) => e.stopPropagation()}
          className="h-6 shrink-0 rounded border-0 bg-transparent px-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer"
        >
          <option value="">—</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label="Supprimer"
        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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
    <li className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group">
      {/* Add to cart button — always visible, far left */}
      {!editing && (
        <button
          type="button"
          onClick={() => !alreadyInCart && onAddToCart(item)}
          aria-label="Ajouter aux prochaines courses"
          title={alreadyInCart ? "Déjà dans les prochaines courses" : "Ajouter aux prochaines courses"}
          disabled={alreadyInCart}
          className={cn(
            "shrink-0 transition-colors",
            alreadyInCart
              ? "text-muted-foreground/30 cursor-default"
              : "text-primary hover:text-primary/70",
          )}
        >
          <ArrowUp className="h-4 w-4" />
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
          <span className="flex-1 text-sm leading-tight">{name}</span>

          {/* Category selector — visible on hover */}
          {labels.length > 0 && (
            <select
              value={item.label?.id ?? ""}
              onChange={(e) => onUpdateLabel(item, e.target.value || undefined)}
              onClick={(e) => e.stopPropagation()}
              className="h-6 shrink-0 rounded border-0 bg-transparent px-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer"
            >
              <option value="">—</option>
              {labels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          )}

          <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              type="button"
              onClick={handleEdit}
              aria-label="Modifier"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              aria-label="Supprimer"
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </li>
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
  // Group by label (no label = "Sans catégorie" group)
  const groups = new Map<string, { label: string; color?: string; items: ShoppingItem[] }>()

  for (const item of items) {
    const key = item.label?.id ?? "__none__"
    const labelName = item.label?.name ?? "Sans catégorie"
    if (!groups.has(key)) {
      groups.set(key, { label: labelName, color: item.label?.color, items: [] })
    }
    groups.get(key)!.items.push(item)
  }

  // Uncategorized group last
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === "__none__") return 1
    if (b === "__none__") return -1
    return 0
  })

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun article dans la liste
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map(([key, group]) => (
        <div key={key}>
          <div className="mb-1 flex items-center gap-2 px-3">
            {group.color && (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
            )}
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </span>
          </div>
          <ul className="divide-y divide-border/40">
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
    <div className="space-y-4">
      {sorted.map(([key, group]) => (
        <div key={key}>
          <div className="mb-1 flex items-center gap-2 px-3">
            {group.color && (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
              />
            )}
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </span>
          </div>
          <ul className="divide-y divide-border/40">
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
        <div className="flex flex-col gap-6">
          {/* ── Prochaines courses ── */}
          <section className="rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-secondary px-4 py-3">
              <h2 className="text-sm font-semibold">Prochaines courses</h2>
              <div className="flex items-center gap-1">
                {checkedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void clearList("checked")}
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Vider cochés ({checkedCount})
                  </Button>
                )}
                {items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void clearList("all")}
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Tout vider
                  </Button>
                )}
              </div>
            </div>

            <div className="p-2">
              <GroupedItems
                items={items}
                labels={labels}
                onToggle={(item) => void toggleItem(item)}
                onDelete={(id) => void deleteItem(id)}
                onUpdateQuantity={(item, qty) => void updateItemQuantity(item, qty)}
                onUpdateLabel={(item, labelId) => void updateItemLabel(item, labelId)}
              />
            </div>

            {/* Manual add */}
            <div className="border-t border-border p-3">
              <form onSubmit={(e) => void handleAddItem(e)} className="flex flex-wrap gap-2">
                {/* Quantity selector */}
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
                  <select
                    value={newItemLabelId}
                    onChange={(e) => setNewItemLabelId(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    disabled={addingItem}
                  >
                    <option value="">Catégorie</option>
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
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
          </section>

          {/* ── Articles habituels ── */}
          <section className="rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-secondary px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Articles habituels</h2>
                <p className="text-xs text-muted-foreground">Lessive, papier toilette...</p>
              </div>
              {habituelsItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void deleteAllHabituels()}
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Tout supprimer
                </Button>
              )}
            </div>

            <div className="p-2">
              <GroupedHabituels
                items={habituelsItems}
                cartItems={items}
                labels={labels}
                onAddToCart={(i) => void addHabituelToCart(i)}
                onDelete={(id) => void deleteHabituel(id)}
                onUpdateNote={(i, note) => void updateHabituelNote(i, note)}
                onUpdateLabel={(i, labelId) => void updateHabituelLabel(i, labelId)}
              />
            </div>

            {/* Add habituel */}
            <div className="border-t border-border p-3">
              <form onSubmit={(e) => void handleAddHabituel(e)} className="flex gap-2">
                <Input
                  ref={newHabituelInputRef}
                  value={newHabituelNote}
                  onChange={(e) => setNewHabituelNote(e.target.value)}
                  placeholder="Ajouter un article habituel..."
                  className="h-8 flex-1 text-sm"
                  disabled={addingHabituel}
                />
                {labels.length > 0 && (
                  <select
                    value={newHabituelLabelId}
                    onChange={(e) => setNewHabituelLabelId(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    disabled={addingHabituel}
                  >
                    <option value="">Catégorie</option>
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
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
          </section>
        </div>
      )}
    </div>
  )
}
