import { useState, useRef } from "react"
import { Minus, Plus, Trash2, Check } from "lucide-react"
import type { ShoppingItem, ShoppingLabel } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../../lib/utils.ts"
import { LabelDropdown } from "./LabelDropdown.tsx"

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

export function MealieItemRow({ item, labels, onToggle, onDelete, onUpdateQuantity, onUpdateNote, onUpdateLabel, onViewRecipe }: MealieItemRowProps) {
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
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </li>
  )
}
