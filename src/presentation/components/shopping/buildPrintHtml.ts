import type { ShoppingItem, ShoppingLabel } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { itemSortKey } from "./itemSortKey.ts"

export function buildPrintHtml(items: ShoppingItem[], labels: ShoppingLabel[], date: string): string {
  const unchecked = items.filter((i) => !i.checked)
  const checked = items.filter((i) => i.checked)

  const buildGroups = (list: ShoppingItem[]) => {
    const groups = new Map<string, { label: string; items: ShoppingItem[] }>()
    for (const item of list) {
      const key = item.label?.id ?? "__none__"
      const labelName = item.label?.name ?? "Sans étiquette"
      if (!groups.has(key)) groups.set(key, { label: labelName, items: [] })
      groups.get(key)!.items.push(item)
    }
    for (const g of groups.values()) {
      g.items.sort((a, b) => itemSortKey(a).localeCompare(itemSortKey(b), "fr"))
    }
    const labelOrder = new Map(labels.map((l, i) => [l.id, i]))
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === "__none__") return 1
      if (b === "__none__") return -1
      return (labelOrder.get(a) ?? Infinity) - (labelOrder.get(b) ?? Infinity)
    })
  }

  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  const renderGroups = (groups: [string, { label: string; items: ShoppingItem[] }][], faded = false) =>
    groups.map(([, group]) => {
      const labelHtml = groups.length > 1
        ? `<p style="font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;color:${faded ? "#aaa" : "#666"};margin:0 0 4px">${escape(group.label)}</p>`
        : ""
      const itemsHtml = group.items.map((item) => {
        const name = escape(item.foodName ?? (item.note?.split(" — ")[0]) ?? "Article")
        const qty = item.quantity && item.quantity > 1 ? `<span style="font-size:9pt;color:#888;margin-left:8px">×${item.quantity}</span>` : ""
        const style = faded ? "opacity:0.35;text-decoration:line-through;color:#aaa" : ""
        return `<div style="display:flex;align-items:center;padding:3px 0;border-bottom:1px solid #eee;${style}">
          <span style="display:inline-block;width:12px;height:12px;border:1.5px solid ${faded ? "#bbb" : "#555"};margin-right:8px;flex-shrink:0"></span>
          <span style="flex:1">${name}</span>${qty}
        </div>`
      }).join("")
      return `<div style="break-inside:avoid;margin-bottom:0.75rem">
        ${labelHtml}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0 1.5rem">${itemsHtml}</div>
      </div>`
    }).join("")

  const allGroups = buildGroups(unchecked)
  const checkedGroups = buildGroups(checked)

  const checkedSection = checked.length > 0 ? `
    <p style="font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin:1.5rem 0 4px;border-top:1px solid #eee;padding-top:0.5rem">Déjà achetés</p>
    ${renderGroups(checkedGroups, true)}
  ` : ""

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
  <title>Liste de courses</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 11pt; color: #111; margin: 0.5cm 0.8cm; }
    @page { margin: 0.5cm 0.8cm; }
  </style>
  </head><body>
  <div style="border-bottom:2px solid #333;margin-bottom:1.5rem;padding-bottom:0.5rem">
    <h1 style="font-size:18pt;font-weight:bold;margin:0">Liste de courses</h1>
    <p style="font-size:9pt;color:#888;margin:4px 0 0">${escape(date)}</p>
  </div>
  ${renderGroups(allGroups)}
  ${checkedSection}
  </body></html>`
}
