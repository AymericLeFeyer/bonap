import { useId, useState, type FormEvent, type ReactNode } from "react"
import { Check, Loader2, Search, Slash } from "lucide-react"
import type {
  CiqualFood,
  NutritionFood,
  NutritionLineReason,
} from "../../../domain/nutrition/entities/NutritionFood.ts"
import type { FoodEdit } from "../../hooks/useNutritionFoods.ts"
import { useCiqualSearch } from "../../hooks/useCiqualSearch.ts"
import { Button } from "../ui/button.tsx"
import { Input } from "../ui/input.tsx"
import { NutritionStatusBadge } from "./NutritionBadges.tsx"
import { LINE_REASON_LABELS } from "./nutritionLabels.ts"

interface NutritionFoodEditorProps {
  foodKey: string
  label: ReactNode
  entry: NutritionFood | null
  reason?: NutritionLineReason
  grams?: number | null
  detail?: ReactNode
  saving: boolean
  onEdit: (edit: FoodEdit) => void
}

function CiqualChoices({ choices, selected, disabled, onChoose }: {
  choices: CiqualFood[]
  selected: string | null
  disabled: boolean
  onChoose: (code: string) => void
}) {
  if (choices.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {choices.map((choice) => (
        <button
          key={choice.code}
          type="button"
          disabled={disabled || choice.code === selected}
          onClick={() => onChoose(choice.code)}
          className="rounded-full border border-border bg-background px-2 py-1 text-xs text-left hover:bg-secondary disabled:opacity-60 disabled:hover:bg-background"
        >
          {choice.name}
        </button>
      ))}
    </div>
  )
}

function PieceWeightField({ value, disabled, onSave }: { value: number | null; disabled: boolean; onSave: (grams: number | null) => void }) {
  const [draft, setDraft] = useState(value ? String(value) : "")
  const inputId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const grams = Number.parseFloat(draft.replace(",", "."))
    onSave(Number.isFinite(grams) && grams > 0 ? grams : null)
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor={inputId}>Poids d'une pièce</label>
      <Input
        id={inputId}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="g"
        className="h-8 w-20 text-xs"
      />
      <Button type="submit" variant="outline" size="sm" disabled={disabled || draft === (value ? String(value) : "")}>
        OK
      </Button>
    </form>
  )
}

/**
 * Correction d'une fiche du dictionnaire : choix CIQUAL, poids d'une pièce,
 * négligeable, validation. Toute correction vaut pour toutes les recettes.
 */
export function NutritionFoodEditor({ foodKey, label, entry, reason, grams, detail, saving, onEdit }: NutritionFoodEditorProps) {
  const [query, setQuery] = useState(foodKey)
  const { results, searching, error, search } = useCiqualSearch()
  const status = entry?.status ?? "to-review"
  const negligible = entry?.negligible ?? false

  const runSearch = (event: FormEvent) => {
    event.preventDefault()
    if (query.trim()) void search(query)
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-border/60 bg-card px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            {negligible ? "Exclu du calcul" : (entry?.ciqualName ?? "Aucun aliment CIQUAL")}
            {grams ? ` · ${grams} g` : ""}
            {entry?.pieceWeight ? ` · ${entry.pieceWeight} g la pièce` : ""}
          </p>
          {reason && reason !== "negligible" && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{LINE_REASON_LABELS[reason]}</p>
          )}
          {detail}
        </div>
        <div className="flex items-center gap-1.5">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <NutritionStatusBadge status={status} origin={entry?.origin} />
        </div>
      </div>

      {!negligible && (
        <>
          <CiqualChoices
            choices={entry?.suggestions ?? []}
            selected={entry?.ciqualCode ?? null}
            disabled={saving}
            onChoose={(code) => onEdit({ ciqualCode: code, status: "proposed" })}
          />

          <form onSubmit={runSearch} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un aliment CIQUAL"
              className="h-8 text-xs"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={searching} className="gap-1.5">
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Rechercher
            </Button>
          </form>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <CiqualChoices
            choices={results}
            selected={entry?.ciqualCode ?? null}
            disabled={saving}
            onChoose={(code) => onEdit({ ciqualCode: code, status: "proposed" })}
          />

          <PieceWeightField
            key={entry?.pieceWeight ?? "none"}
            value={entry?.pieceWeight ?? null}
            disabled={saving}
            onSave={(pieceWeight) => onEdit({ pieceWeight })}
          />
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => onEdit({ negligible: !negligible })}
          className="gap-1.5"
        >
          <Slash className="h-3.5 w-3.5" />
          {negligible ? "Compter dans le calcul" : "Négligeable"}
        </Button>
        {!negligible && entry?.ciqualCode && status !== "validated" && (
          <Button type="button" size="sm" disabled={saving} onClick={() => onEdit({ status: "validated" })} className="gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Valider pour toutes les recettes
          </Button>
        )}
      </div>
    </div>
  )
}
