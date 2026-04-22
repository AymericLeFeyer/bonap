import type { ShoppingItem, ShoppingLabel } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { cn } from "../../../lib/utils.ts"
import { labelColor } from "./labelColor.ts"
import { MealieItemRow } from "./MealieItemRow.tsx"
import { itemSortKey } from "./itemSortKey.ts"

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

interface GroupedItemsProps {
  items: ShoppingItem[]
  labels: ShoppingLabel[]
  onToggle: (item: ShoppingItem) => void
  onDelete: (id: string) => void
  onUpdateQuantity: (item: ShoppingItem, qty: number) => void
  onUpdateNote: (item: ShoppingItem, note: string) => void
  onUpdateLabel: (item: ShoppingItem, labelId: string | undefined) => void
  onViewRecipe?: (recipeName: string) => void
}

export function GroupedItems({ items, labels, onToggle, onDelete, onUpdateQuantity, onUpdateNote, onUpdateLabel, onViewRecipe }: GroupedItemsProps) {
  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  const buildGroups = (list: ShoppingItem[]) => {
    const groups = new Map<string, { label: string; color?: string; items: ShoppingItem[] }>()
    for (const item of list) {
      const key = item.label?.id ?? "__none__"
      const labelName = item.label?.name ?? "Sans étiquette"
      if (!groups.has(key)) groups.set(key, { label: labelName, color: item.label?.color, items: [] })
      groups.get(key)!.items.push(item)
    }
    for (const group of groups.values()) {
      group.items.sort((a, b) => itemSortKey(a).localeCompare(itemSortKey(b), "fr"))
    }
    const labelOrder = new Map(labels.map((l, i) => [l.id, i]))
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "__none__") return 1
      if (b === "__none__") return -1
      return (labelOrder.get(a) ?? Infinity) - (labelOrder.get(b) ?? Infinity)
    })
  }

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Aucun article dans la liste</p>
  }

  const uncheckedGroups = buildGroups(unchecked)
  const checkedGroups = buildGroups(checked)

  return (
    <div>
      {uncheckedGroups.map(([key, group]) => (
        <div key={key}>
          {uncheckedGroups.length > 1 && <GroupHeader label={group.label} color={group.color} />}
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
          {checkedGroups.length > 1 && <GroupHeader label={group.label} color={group.color} />}
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
