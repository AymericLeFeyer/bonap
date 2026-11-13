import { useState } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../ui/dialog.tsx"
import { Button } from "../ui/button.tsx"
import { Input } from "../ui/input.tsx"
import { useSuggestBatchRecipes } from "../../hooks/useSuggestBatchRecipes.ts"
import type { BatchSuggestion } from "../../../application/recipe/usecases/SuggestBatchRecipesUseCase.ts"
import type { BatchInfo } from "../../../shared/utils/batch.ts"
import { RecipeImage } from "../RecipeImage.tsx"
import { cn } from "../../../lib/utils.ts"

interface Draft {
  selected: boolean
  fridgeDays?: number
  freezerDays?: number
}

function parseDays(value: string): number | undefined {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * L'IA passe en revue les plats qui ne sont pas encore batch et propose ceux
 * qui s'y prêtent, avec des durées de conservation. Rien n'est écrit avant
 * la validation ; les durées restent modifiables.
 */
export function BatchAiDialog({
  open,
  onOpenChange,
  applyBatch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  applyBatch: (slug: string, update: (current: BatchInfo) => BatchInfo) => Promise<unknown>
}) {
  const { suggestions, loading, progress, error, run, cancel } = useSuggestBatchRecipes()
  // Seules les modifications de l'utilisateur sont stockées ; le reste vient de la suggestion.
  const [overrides, setOverrides] = useState<Record<string, Partial<Draft>>>({})
  const [applying, setApplying] = useState<{ done: number; total: number } | null>(null)
  const [applied, setApplied] = useState<number | null>(null)

  const draftFor = (s: BatchSuggestion): Draft => ({
    selected: true,
    fridgeDays: s.fridgeDays,
    freezerDays: s.freezerDays,
    ...overrides[s.slug],
  })

  const startAnalysis = () => {
    setOverrides({})
    void run()
  }

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      cancel()
      setApplied(null)
    }
    onOpenChange(value)
  }

  const patchDraft = (slug: string, patch: Partial<Draft>) =>
    setOverrides((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }))

  const selected = (suggestions ?? []).filter((s) => draftFor(s).selected)

  const apply = async () => {
    setApplying({ done: 0, total: selected.length })
    let done = 0
    for (const suggestion of selected) {
      const draft = draftFor(suggestion)
      await applyBatch(suggestion.slug, (current) => ({
        ...current,
        enabled: true,
        // Des durées déjà saisies à la main priment sur l'estimation de l'IA.
        fridgeDays: current.fridgeDays ?? draft.fridgeDays,
        freezerDays: current.freezerDays ?? draft.freezerDays,
      }))
      done += 1
      setApplying({ done, total: selected.length })
    }
    setApplying(null)
    setApplied(done)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Détecter les recettes batch
          </DialogTitle>
          <DialogDescription>
            L'IA parcourt vos plats qui ne sont pas encore marqués batch et propose ceux qui se
            préparent à l'avance, avec des durées de conservation à vérifier.
          </DialogDescription>
        </DialogHeader>

        {applied !== null ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Check className="h-8 w-8 text-primary" />
            <p className="text-sm">{applied} {applied > 1 ? "recettes marquées" : "recette marquée"} batch.</p>
            <Button size="sm" onClick={() => handleOpenChange(false)}>Fermer</Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            {progress && progress.total > 0
              ? `Analyse des recettes… ${progress.done} / ${progress.total}`
              : "Chargement des recettes…"}
            <Button variant="ghost" size="sm" onClick={cancel}>Annuler</Button>
          </div>
        ) : suggestions === null ? (
          <div className="flex flex-col items-center gap-3 py-8">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={startAnalysis}>
              <Sparkles className="h-4 w-4" />
              Lancer l'analyse
            </Button>
          </div>
        ) : suggestions.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aucune nouvelle recette ne semble se prêter au batch cooking.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{selected.length} / {suggestions.length} sélectionnée{selected.length > 1 ? "s" : ""}</span>
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => {
                  const all = selected.length < suggestions.length
                  setOverrides((prev) => Object.fromEntries(
                    suggestions.map((sug) => [sug.slug, { ...prev[sug.slug], selected: all }]),
                  ))
                }}
              >
                {selected.length < suggestions.length ? "Tout cocher" : "Tout décocher"}
              </button>
            </div>
            <ul className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              {suggestions.map((s) => {
                const draft = draftFor(s)
                return (
                  <li
                    key={s.slug}
                    className={cn(
                      "flex items-start gap-3 rounded-[var(--radius-lg)] border p-2 transition-colors",
                      draft.selected ? "border-primary/40 bg-primary/5" : "border-border/50 opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={draft.selected}
                      onChange={(e) => patchDraft(s.slug, { selected: e.target.checked })}
                      className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                      aria-label={`Marquer ${s.recipe.name} batch`}
                    />
                    <RecipeImage
                      recipe={s.recipe}
                      alt={s.recipe.name}
                      className="h-11 w-11 shrink-0 rounded-[var(--radius-md)] object-cover"
                      fallbackClassName="h-11 w-11 shrink-0 rounded-[var(--radius-md)]"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-tight">{s.recipe.name}</p>
                      {s.reason && <p className="text-xs text-muted-foreground">{s.reason}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <label className="flex items-center gap-1">
                          Frigo
                          <Input
                            type="number"
                            min={1}
                            value={draft.fridgeDays ?? ""}
                            placeholder="—"
                            onChange={(e) => patchDraft(s.slug, { fridgeDays: parseDays(e.target.value) })}
                            className="h-7 w-14 px-2 text-xs"
                          />
                          j
                        </label>
                        <label className="flex items-center gap-1">
                          Congélateur
                          <Input
                            type="number"
                            min={1}
                            value={draft.freezerDays ?? ""}
                            placeholder="—"
                            onChange={(e) => patchDraft(s.slug, { freezerDays: parseDays(e.target.value) })}
                            className="h-7 w-16 px-2 text-xs"
                          />
                          j
                        </label>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)} disabled={applying !== null}>
                Annuler
              </Button>
              <Button size="sm" onClick={() => void apply()} disabled={selected.length === 0 || applying !== null}>
                {applying
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {applying.done} / {applying.total}</>
                  : `Marquer ${selected.length} recette${selected.length > 1 ? "s" : ""} batch`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
