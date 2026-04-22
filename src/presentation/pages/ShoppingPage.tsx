import { useState, useRef, useEffect } from "react"
import { Loader2, AlertCircle, Plus, Minus, RefreshCw, Tag, Sparkles, Printer } from "lucide-react"
import { useDefaultHabituels } from "../hooks/useDefaultHabituels.ts"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { useShopping } from "../hooks/useShopping.ts"
import { useCategorizeItems } from "../hooks/useCategorizeItems.ts"
import { RecipeDetailModal } from "../components/RecipeDetailModal.tsx"
import { recipeSlugStore } from "../../infrastructure/shopping/RecipeSlugStore.ts"
import { foodLabelStore } from "../../infrastructure/shopping/FoodLabelStore.ts"
import { getRecipesUseCase } from "../../infrastructure/container.ts"
import { extractFoodKey } from "../../shared/utils/food.ts"
import { cn } from "../../lib/utils.ts"
import { getEnv } from "../../shared/utils/env.ts"
import { GroupedItems } from "../components/shopping/GroupedItems.tsx"
import { GroupedHabituels } from "../components/shopping/GroupedHabituels.tsx"
import { DefaultCatalogModal } from "../components/shopping/DefaultCatalogModal.tsx"
import { FormLabelSelect } from "../components/shopping/FormLabelSelect.tsx"
import { buildPrintHtml } from "../components/shopping/buildPrintHtml.ts"
import type { ShoppingItem } from "../../domain/shopping/entities/ShoppingItem.ts"

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
  const { enabled: showDefaultCatalog } = useDefaultHabituels()
  const [catalogOpen, setCatalogOpen] = useState(false)

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
  const newItemInputRef = useRef<HTMLInputElement>(null)
  const newHabituelInputRef = useRef<HTMLInputElement>(null)

  const checkedCount = items.filter((i) => i.checked).length
  const totalCount = items.length
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const handleViewRecipe = async (recipeName: string) => {
    let slug = recipeSlugStore.lookup(recipeName)
    if (!slug) {
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

  const handlePrint = () => {
    const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    const html = buildPrintHtml(items, labels, date)
    const iframe = document.createElement("iframe")
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0"
    document.body.appendChild(iframe)
    iframe.contentDocument!.open()
    iframe.contentDocument!.write(html)
    iframe.contentDocument!.close()
    iframe.contentWindow!.onafterprint = () => document.body.removeChild(iframe)
    iframe.contentWindow!.print()
  }

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
            <button
              type="button"
              onClick={handlePrint}
              disabled={items.length === 0}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[var(--radius-lg)]",
                "text-muted-foreground hover:text-foreground hover:bg-secondary",
                "transition-colors disabled:opacity-50",
              )}
              aria-label="Imprimer / exporter PDF"
              title="Imprimer / exporter PDF"
            >
              <Printer className="h-4 w-4" />
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
              {totalCount > 0 && (
                <div className="px-4 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{progressPct}% complété</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{checkedCount}/{totalCount}</span>
                      {labels.length > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleAiCategorize(items.filter((i) => !i.checked && !i.label))}
                          disabled={aiLoading || items.filter((i) => !i.checked && !i.label).length === 0}
                          title="Catégoriser les articles sans étiquette via IA"
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.10em] text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {aiLoading
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Sparkles className="h-3 w-3" />
                          }
                          IA
                        </button>
                      )}
                    </div>
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
                onViewRecipe={(name) => void handleViewRecipe(name)}
              />

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
                  <Button type="submit" size="sm" className="h-8 shrink-0" disabled={addingItem || !newItemNote.trim()}>
                    {addingItem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
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
                {showDefaultCatalog && (
                  <button
                    type="button"
                    onClick={() => setCatalogOpen(true)}
                    title="Catalogue par défaut"
                    className="flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <Sparkles className="h-3 w-3" />
                    Catalogue
                  </button>
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
                  <Button type="submit" size="sm" className="h-8 shrink-0" disabled={addingHabituel || !newHabituelNote.trim()}>
                    {addingHabituel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
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

      <DefaultCatalogModal
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        habituelsItems={habituelsItems}
        onAdd={(name) => void addHabituel(name)}
      />
    </div>
  )
}
