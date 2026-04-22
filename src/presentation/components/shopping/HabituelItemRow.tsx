import { useState, useRef } from "react"
import { Trash2, Check, ArrowUp, Pencil, X } from "lucide-react"
import type { ShoppingItem, ShoppingLabel } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../../lib/utils.ts"
import { extractFoodKey } from "../../../shared/utils/food.ts"
import { Input } from "../ui/input.tsx"
import { LabelDropdown } from "./LabelDropdown.tsx"

interface HabituelItemRowProps {
  item: ShoppingItem
  labels: ShoppingLabel[]
  cartItems: ShoppingItem[]
  onAddToCart: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateNote: (item: ShoppingItem, note: string) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
}

export function HabituelItemRow({ item, labels, cartItems, onAddToCart, onDelete, onUpdateNote, onUpdateLabel }: HabituelItemRowProps) {
  const itemKey = extractFoodKey(item.foodName ?? item.note ?? "")
  const alreadyInCart = cartItems.some((i) => {
    if (i.checked) return false
    if (itemKey) {
      const cartKey = extractFoodKey(i.foodName ?? i.note ?? "")
      return cartKey === itemKey
    }
    return i.note?.toLowerCase() === item.note?.toLowerCase()
  })
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
    if (trimmed) onUpdateNote(item, trimmed)
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
          <button type="button" onClick={handleSave} className="text-primary hover:text-primary/80 transition-colors">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium leading-tight">{name}</span>
          <div className="flex shrink-0 items-center gap-1 transition-all sm:opacity-0 sm:group-hover:opacity-100">
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
