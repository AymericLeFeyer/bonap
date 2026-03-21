import { useState, useRef } from "react"
import {
  ShoppingCart,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  Pencil,
  X,
  Check,
} from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { useShopping } from "../hooks/useShopping.ts"
import type { ShoppingItem, CustomItem } from "../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../lib/utils.ts"

// ─── Composant item Mealie ─────────────────────────────────────────────────────

interface MealieItemRowProps {
  item: ShoppingItem
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
}

function MealieItemRow({ item, onToggle, onDelete }: MealieItemRowProps) {
  const label = item.display ?? item.note ?? item.foodName ?? "Article sans nom"
  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group">
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

      <span
        className={cn(
          "flex-1 text-sm leading-tight",
          item.checked && "line-through text-muted-foreground",
        )}
      >
        {label}
      </span>

      {item.label && (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={
            item.label.color
              ? { backgroundColor: `${item.label.color}30`, color: item.label.color }
              : undefined
          }
        >
          {item.label.name}
        </span>
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

// ─── Composant item custom ─────────────────────────────────────────────────────

interface CustomItemRowProps {
  item: CustomItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, note: string) => void
}

function CustomItemRow({ item, onToggle, onDelete, onUpdate }: CustomItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.note)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleEdit = () => {
    setEditValue(item.note)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(item.id, editValue.trim())
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") setEditing(false)
  }

  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-label={item.checked ? "Décocher" : "Cocher"}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
      >
        {item.checked ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>

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
          <span
            className={cn(
              "flex-1 text-sm leading-tight",
              item.checked && "line-through text-muted-foreground",
            )}
          >
            {item.note}
          </span>
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
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
}

function GroupedItems({ items, onToggle, onDelete }: GroupedItemsProps) {
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
                onToggle={onToggle}
                onDelete={onDelete}
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
    customItems,
    loading,
    error,
    addItem,
    toggleItem,
    deleteItem,
    clearList,
    addCustomItem,
    toggleCustomItem,
    deleteCustomItem,
    clearCustomItems,
    updateCustomItem,
    reload,
  } = useShopping()

  const [newItemNote, setNewItemNote] = useState("")
  const [newCustomNote, setNewCustomNote] = useState("")
  const [addingItem, setAddingItem] = useState(false)

  const checkedCount = items.filter((i) => i.checked).length
  const customCheckedCount = customItems.filter((i) => i.checked).length

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const note = newItemNote.trim()
    if (!note) return
    setAddingItem(true)
    try {
      await addItem(note)
      setNewItemNote("")
    } finally {
      setAddingItem(false)
    }
  }

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    const note = newCustomNote.trim()
    if (!note) return
    addCustomItem(note)
    setNewCustomNote("")
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
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Rafraîchir"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Spinner initial */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* ── Left column: Mealie ingredients ── */}
          <section className="rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-secondary px-4 py-3">
              <h2 className="text-sm font-semibold">Ingrédients</h2>
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
                onToggle={(item) => void toggleItem(item)}
                onDelete={(id) => void deleteItem(id)}
              />
            </div>

            {/* Ajout manuel */}
            <div className="border-t border-border p-3">
              <form onSubmit={(e) => void handleAddItem(e)} className="flex gap-2">
                <Input
                  value={newItemNote}
                  onChange={(e) => setNewItemNote(e.target.value)}
                  placeholder="Ajouter un article..."
                  className="h-8 flex-1 text-sm"
                  disabled={addingItem}
                />
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

          {/* ── Colonne droite : articles habituels non alimentaires ── */}
          <section className="rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-secondary px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Articles habituels</h2>
                <p className="text-xs text-muted-foreground">Lessive, papier toilette...</p>
              </div>
              <div className="flex items-center gap-1">
                {customCheckedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCustomItems("checked")}
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Vider cochés ({customCheckedCount})
                  </Button>
                )}
                {customItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearCustomItems("all")}
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Tout vider
                  </Button>
                )}
              </div>
            </div>

            <div className="p-2">
              {customItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucun article habituel
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {customItems.map((item) => (
                    <CustomItemRow
                      key={item.id}
                      item={item}
                      onToggle={toggleCustomItem}
                      onDelete={deleteCustomItem}
                      onUpdate={updateCustomItem}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Ajout */}
            <div className="border-t border-border p-3">
              <form onSubmit={handleAddCustomItem} className="flex gap-2">
                <Input
                  value={newCustomNote}
                  onChange={(e) => setNewCustomNote(e.target.value)}
                  placeholder="Ajouter un article habituel..."
                  className="h-8 flex-1 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={!newCustomNote.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
