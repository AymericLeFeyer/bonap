import { useState } from "react"
import { Plus, Check, ChevronRight } from "lucide-react"
import { DEFAULT_HABITUELS } from "../../../shared/constants/defaultHabituels.ts"
import type { ShoppingItem } from "../../../domain/shopping/entities/ShoppingItem.ts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.tsx"
import { cn } from "../../../lib/utils.ts"

interface DefaultCatalogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  habituelsItems: ShoppingItem[]
  onAdd: (name: string) => void
}

export function DefaultCatalogModal({ open, onOpenChange, habituelsItems, onAdd }: DefaultCatalogModalProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isInHabituels = (name: string) =>
    habituelsItems.some((i) => (i.note ?? "").toLowerCase() === name.toLowerCase())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="font-heading text-base">Catalogue par défaut</DialogTitle>
          <p className="text-xs text-muted-foreground">Cliquez sur + pour ajouter un article à vos habituels.</p>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 border-t border-border/40">
          {DEFAULT_HABITUELS.map((category) => {
            const isOpen = openCategories.has(category.id)
            return (
              <div key={category.id} className="border-b border-border/20 last:border-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-center gap-2.5 px-5 py-3 text-left hover:bg-secondary/40 transition-colors"
                >
                  <span className="text-base leading-none">{category.emoji}</span>
                  <span className="flex-1 text-sm font-semibold">{category.label}</span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-150",
                      isOpen && "rotate-90",
                    )}
                  />
                </button>
                {isOpen && (
                  <ul className="pb-1 bg-secondary/10">
                    {category.items.map((item) => {
                      const already = isInHabituels(item)
                      return (
                        <li
                          key={item}
                          className="flex items-center gap-3 px-5 py-2 hover:bg-secondary/30 transition-colors"
                        >
                          <span className={cn("flex-1 text-sm", already && "text-muted-foreground/50")}>{item}</span>
                          {already ? (
                            <Check className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAdd(item)}
                              aria-label={`Ajouter ${item} aux habituels`}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
