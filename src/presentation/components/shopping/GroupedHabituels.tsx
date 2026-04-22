import type { ShoppingItem, ShoppingLabel } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../../lib/utils.ts"
import { labelColor } from "./labelColor.ts"
import { HabituelItemRow } from "./HabituelItemRow.tsx"

interface GroupHeaderProps {
  label: string
  color?: string
  isFirst?: boolean
}

function GroupHeader({ label, isFirst }: GroupHeaderProps) {
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
    </div>
  )
}

interface GroupedHabituelsProps {
  items: ShoppingItem[]
  cartItems: ShoppingItem[]
  labels: ShoppingLabel[]
  onAddToCart: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateNote: (item: ShoppingItem, note: string) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
}

export function GroupedHabituels({ items, cartItems, labels, onAddToCart, onDelete, onUpdateNote, onUpdateLabel }: GroupedHabituelsProps) {
  const groups = new Map<string, { label: string; color?: string; items: ShoppingItem[] }>()

  for (const item of items) {
    const key = item.label?.id ?? "__none__"
    const labelName = item.label?.name ?? "Sans étiquette"
    if (!groups.has(key)) groups.set(key, { label: labelName, color: item.label?.color, items: [] })
    groups.get(key)!.items.push(item)
  }

  const labelOrder = new Map(labels.map((l, i) => [l.id, i]))
  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === "__none__") return 1
    if (b === "__none__") return -1
    return (labelOrder.get(a) ?? Infinity) - (labelOrder.get(b) ?? Infinity)
  })

  if (sorted.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Aucun article habituel</p>
  }

  return (
    <div>
      {sorted.map(([key, group], i) => (
        <div key={key}>
          {sorted.length > 1 && <GroupHeader label={group.label} color={group.color} isFirst={i === 0} />}
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
