import { useState, useRef, type ChangeEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Link } from "react-router-dom"
import { useRecipeForm } from "../hooks/useRecipeForm.ts"
import { useCategories } from "../hooks/useCategories.ts"
import { useFoods } from "../hooks/useFoods.ts"
import { useUnits } from "../hooks/useUnits.ts"
import { Button } from "../components/ui/button.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { Input } from "../components/ui/input.tsx"
import { SeasonBadge } from "../components/SeasonBadge.tsx"
import { Autocomplete } from "../components/ui/autocomplete.tsx"
import {
  InlineEditText,
  InlineEditDuration,
} from "../components/RecipeEditorShared.tsx"
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ImagePlus,
  Check,
} from "lucide-react"
import type {
  RecipeFormData,
  RecipeFormIngredient,
  RecipeFormInstruction,
  Season,
} from "../../shared/types/mealie.ts"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie.ts"

// ─── État initial ──────────────────────────────────────────────────────────────

function buildEmptyFormData(): RecipeFormData {
  return {
    name: "",
    description: "",
    prepTime: "",
    performTime: "",
    totalTime: "",
    recipeIngredient: [
      { quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" },
    ],
    recipeInstructions: [{ text: "" }],
    seasons: [],
    categories: [],
    tags: [],
  }
}

// ─── Page création recette ─────────────────────────────────────────────────────

export function RecipeFormPage() {
  const navigate = useNavigate()
  const { createRecipe, loading: saving, error: saveError } = useRecipeForm()
  const { categories: allCategories } = useCategories()
  const { foods } = useFoods()
  const { units } = useUnits()

  const [formData, setFormData] = useState<RecipeFormData>(buildEmptyFormData)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const patch = (partial: Partial<RecipeFormData>) => {
    setFormData((prev) => ({ ...prev, ...partial }))
  }

  // ─── Image ──────────────────────────────────────────────────────────────────

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    patch({ imageFile: file })
    setImagePreview(URL.createObjectURL(file))
  }

  // ─── Catégories ─────────────────────────────────────────────────────────────

  const handleToggleCategory = (cat: { id: string; name: string; slug: string }) => {
    const isActive = formData.categories.some((c) => c.id === cat.id)
    patch({
      categories: isActive
        ? formData.categories.filter((c) => c.id !== cat.id)
        : [...formData.categories, { id: cat.id, name: cat.name, slug: cat.slug }],
    })
  }

  // ─── Saisons ────────────────────────────────────────────────────────────────

  const handleToggleSeason = (season: Season) => {
    const active = formData.seasons.includes(season)
    patch({
      seasons: active
        ? formData.seasons.filter((s) => s !== season)
        : [...formData.seasons, season],
    })
  }

  // ─── Ingrédients ────────────────────────────────────────────────────────────

  const addIngredient = () => {
    patch({
      recipeIngredient: [
        ...formData.recipeIngredient,
        { quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" },
      ],
    })
  }

  const removeIngredient = (index: number) => {
    patch({ recipeIngredient: formData.recipeIngredient.filter((_, i) => i !== index) })
  }

  const updateIngredientField = (index: number, partial: Partial<RecipeFormIngredient>) => {
    patch({
      recipeIngredient: formData.recipeIngredient.map((ing, i) =>
        i === index ? { ...ing, ...partial } : ing,
      ),
    })
  }

  // ─── Instructions ────────────────────────────────────────────────────────────

  const addInstruction = () => {
    patch({
      recipeInstructions: [...formData.recipeInstructions, { text: "" }],
    })
  }

  const removeInstruction = (index: number) => {
    patch({ recipeInstructions: formData.recipeInstructions.filter((_, i) => i !== index) })
  }

  const updateInstruction = (index: number, value: string) => {
    patch({
      recipeInstructions: formData.recipeInstructions.map(
        (s, i): RecipeFormInstruction => (i === index ? { text: value } : s),
      ),
    })
  }

  // ─── Soumission ──────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    const result = await createRecipe(formData)
    if (result) {
      navigate(`/recipes/${result.slug}`)
    }
  }

  // ─── Options autocomplete ─────────────────────────────────────────────────────

  const foodOptions = foods.map((f) => ({ id: f.id, label: f.name }))
  const unitOptions = units.map((u) => ({
    id: u.id,
    label: u.useAbbreviation && u.abbreviation ? u.abbreviation : u.name,
  }))

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/recipes">&larr; Recettes</Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/recipes")}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => void handleCreate()}
            disabled={saving || !formData.name.trim()}
            className="gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Créer la recette
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Erreur */}
      {saveError && (
        <div className="rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <article className="space-y-6">
        {/* Image */}
        <div className="space-y-2">
          <div
            className="group relative overflow-hidden rounded-[var(--radius-xl)] cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Cliquer pour ajouter une photo"
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <span className="flex flex-col items-center gap-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus className="h-7 w-7" />
                    <span className="text-xs font-medium">Changer la photo</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-ring hover:bg-muted/50">
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">Cliquer pour ajouter une photo</span>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        {/* Titre + métadonnées */}
        <div className="space-y-3">
          <InlineEditText
            value={formData.name}
            displayValue={
              formData.name ? (
                <span className="font-heading text-2xl font-bold leading-snug tracking-tight">
                  {formData.name}
                </span>
              ) : undefined
            }
            onChange={(v) => patch({ name: v })}
            placeholder="Nom de la recette"
            as="h1"
            inputClassName="font-heading text-2xl font-bold"
            disabled={saving}
            autoFocus
          />

          {/* Catégories */}
          {allCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allCategories.map((cat) => {
                const active = formData.categories.some((c) => c.id === cat.id)
                return (
                  <Badge
                    key={cat.id}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer select-none transition-colors text-xs"
                    onClick={() => handleToggleCategory(cat)}
                  >
                    {cat.name}
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Saisons */}
          <div className="space-y-1.5">
            {formData.seasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.seasons.map((season) => (
                  <SeasonBadge key={season} season={season} size="md" />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {SEASONS.map((season: Season) => {
                const active = formData.seasons.includes(season)
                return (
                  <Badge
                    key={season}
                    variant={active ? "default" : "outline"}
                    className="cursor-pointer select-none transition-colors text-xs"
                    onClick={() => handleToggleSeason(season)}
                  >
                    {SEASON_LABELS[season]}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Durées */}
          <div className="flex flex-wrap gap-4">
            <InlineEditDuration
              label="Préparation"
              value={formData.prepTime}
              onChange={(v) => patch({ prepTime: v })}
              disabled={saving}
            />
            <InlineEditDuration
              label="Cuisson"
              value={formData.performTime}
              onChange={(v) => patch({ performTime: v })}
              disabled={saving}
            />
             <InlineEditDuration
              label="Total"
              value={formData.totalTime}
              onChange={(v) => patch({ totalTime: v })}
              disabled={saving}
            />
          </div>

          {/* Description */}
          <InlineEditText
            value={formData.description}
            onChange={(v) => patch({ description: v })}
            placeholder="Ajouter une description…"
            multiline
            rows={3}
            as="p"
            className="text-sm text-muted-foreground leading-relaxed"
            disabled={saving}
          />
        </div>

        {/* Ingrédients */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-tight">Ingrédients</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              disabled={saving}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>

          <div className="hidden sm:grid sm:grid-cols-[16px_70px_1fr_1fr_1.5fr_32px] sm:gap-2 sm:items-center px-1">
            <span />
            <span className="text-xs text-muted-foreground font-medium">Qté</span>
            <span className="text-xs text-muted-foreground font-medium">Unité</span>
            <span className="text-xs text-muted-foreground font-medium">Ingrédient</span>
            <span className="text-xs text-muted-foreground font-medium">Notes</span>
            <span />
          </div>

          <div className="space-y-2">
            {formData.recipeIngredient.map((ing, index) => (
              <div
                key={index}
                className="grid grid-cols-[16px_55px_1fr_1fr_32px] sm:grid-cols-[16px_70px_1fr_1fr_1.5fr_32px] gap-2 items-center"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />

                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Qté"
                  value={ing.quantity}
                  onChange={(e) => updateIngredientField(index, { quantity: e.target.value })}
                  disabled={saving}
                  className="min-w-0 px-2"
                  aria-label={`Quantité ingrédient ${index + 1}`}
                />

                <Autocomplete
                  value={ing.unit}
                  onChange={(value, option) =>
                    updateIngredientField(index, { unit: value, unitId: option?.id })
                  }
                  options={unitOptions}
                  placeholder="Unité…"
                  disabled={saving}
                  inputClassName="bg-white dark:bg-zinc-900"
                  aria-label={`Unité ingrédient ${index + 1}`}
                />

                <Autocomplete
                  value={ing.food}
                  onChange={(value, option) =>
                    updateIngredientField(index, {
                      food: value,
                      foodId: option && option.id !== "__create__" ? option.id : undefined,
                    })
                  }
                  options={foodOptions}
                  placeholder="Ingrédient…"
                  disabled={saving}
                  allowCreate
                  createLabel={(v) => `Créer "${v}"`}
                  inputClassName="bg-white dark:bg-zinc-900"
                  aria-label={`Ingrédient ${index + 1}`}
                />

                <Input
                  type="text"
                  placeholder="Notes…"
                  value={ing.note}
                  onChange={(e) => updateIngredientField(index, { note: e.target.value })}
                  disabled={saving}
                  className="hidden sm:block min-w-0 px-2"
                  aria-label={`Notes ingrédient ${index + 1}`}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeIngredient(index)}
                  disabled={saving || formData.recipeIngredient.length <= 1}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Supprimer ingrédient ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Instructions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold tracking-tight">Instructions</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInstruction}
              disabled={saving}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>

          <ol className="space-y-4">
            {formData.recipeInstructions.map((step, index) => (
              <li key={index} className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/8 text-[11px] font-bold text-primary mt-1">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={step.text}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                    placeholder={`Étape ${index + 1}…`}
                    disabled={saving}
                    rows={2}
                    className={[
                      "w-full rounded-md border-transparent bg-transparent px-2 py-1 text-sm text-muted-foreground leading-relaxed",
                      "placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-input",
                      "focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring",
                      "hover:bg-muted/30 transition-colors resize-none",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    ].join(" ")}
                    aria-label={`Étape ${index + 1}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInstruction(index)}
                  disabled={saving}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ol>
        </section>

        {/* Sticky bar création */}
        <div className="sticky bottom-4 flex justify-end gap-2 rounded-[var(--radius-xl)] border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/recipes")}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={() => void handleCreate()}
            disabled={saving || !formData.name.trim()}
            className="gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Création…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Créer la recette
              </>
            )}
          </Button>
        </div>
      </article>
    </div>
  )
}
