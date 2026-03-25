import { useState, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Loader2, Plus, Trash2, GripVertical, ImagePlus, X } from "lucide-react"
import { Button } from "../components/ui/button.tsx"
import { Input } from "../components/ui/input.tsx"
import { Label } from "../components/ui/label.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { Autocomplete } from "../components/ui/autocomplete.tsx"
import { useRecipe } from "../hooks/useRecipe.ts"
import { useRecipeForm } from "../hooks/useRecipeForm.ts"
import { useCategories } from "../hooks/useCategories.ts"
import { useTags } from "../hooks/useTags.ts"
import { useFoods } from "../hooks/useFoods.ts"
import { useUnits } from "../hooks/useUnits.ts"
import type {
  MealieRecipe,
  RecipeFormData,
  RecipeFormIngredient,
  RecipeFormInstruction,
  Season,
} from "../../shared/types/mealie.ts"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags, isSeasonTag } from "../../shared/utils/season.ts"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePrepTimeToMinutes(value?: string): string {
  if (!value) return ""
  if (/^\d+$/.test(value.trim())) {
    const n = parseInt(value.trim(), 10)
    return n > 0 ? String(n) : ""
  }
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return ""
  const hours = parseInt(match[1] ?? "0")
  const minutes = parseInt(match[2] ?? "0")
  const total = hours * 60 + minutes
  return total > 0 ? String(total) : ""
}

function buildInitialIngredients(recipe?: MealieRecipe): RecipeFormIngredient[] {
  if (!recipe?.recipeIngredient?.length) {
    return [{ quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" }]
  }
  const structured = recipe.recipeIngredient
    .filter((ing) => ing.food?.name || ing.unit?.name || (ing.quantity != null && ing.quantity !== 0) || ing.note)
    .map((ing) => ({
      quantity: ing.quantity != null && ing.quantity !== 0 ? String(ing.quantity) : "",
      unit: ing.unit?.name ?? "",
      unitId: ing.unit?.id,
      food: ing.food?.name ?? "",
      foodId: ing.food?.id,
      note: ing.note ?? "",
    }))
  return [...structured, { quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" }]
}

function buildInitialInstructions(recipe?: MealieRecipe): RecipeFormInstruction[] {
  if (!recipe?.recipeInstructions?.length) return [{ text: "" }]
  return recipe.recipeInstructions.map((step) => ({ text: step.text }))
}

function buildInitialFormData(recipe?: MealieRecipe): RecipeFormData {
  return {
    name: recipe?.name ?? "",
    description: recipe?.description ?? "",
    prepTime: parsePrepTimeToMinutes(recipe?.prepTime),
    cookTime: parsePrepTimeToMinutes(recipe?.cookTime),
    recipeIngredient: buildInitialIngredients(recipe),
    recipeInstructions: buildInitialInstructions(recipe),
    seasons: getRecipeSeasonsFromTags(recipe?.tags),
    categories: (recipe?.recipeCategory ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    tags: (recipe?.tags ?? []).filter((t) => !isSeasonTag(t)).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  }
}

function formatMinutes(value: string): string {
  const n = Number(value)
  if (!n || n <= 0) return ""
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h > 0 && m > 0) return `${h} h ${m} min`
  if (h > 0) return `${h} h`
  return `${m} min`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
      <div className="h-8 w-1/3 rounded-md bg-muted" />
      <div className="h-10 w-full rounded-md bg-muted" />
      <div className="h-24 w-full rounded-md bg-muted" />
      <div className="flex gap-4">
        <div className="h-10 w-32 rounded-md bg-muted" />
        <div className="h-10 w-32 rounded-md bg-muted" />
      </div>
      <div className="h-40 w-full rounded-md bg-muted" />
      <div className="h-40 w-full rounded-md bg-muted" />
    </div>
  )
}

// ─── Form content ─────────────────────────────────────────────────────────────

interface RecipeFormContentProps {
  recipe?: MealieRecipe
  isEditing: boolean
}

function RecipeFormContent({ recipe, isEditing }: RecipeFormContentProps) {
  const navigate = useNavigate()
  const { createRecipe, updateRecipe, loading, error } = useRecipeForm()
  const { categories } = useCategories()
  const { tags } = useTags()
  const { foods } = useFoods()
  const { units } = useUnits()

  const [formData, setFormData] = useState<RecipeFormData>(() => buildInitialFormData(recipe))
  const [imagePreview, setImagePreview] = useState<string | null>(
    recipe?.id ? `/api/media/recipes/${recipe.id}/images/original.webp` : null,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const foodOptions = foods.map((f) => ({ id: f.id, label: f.name }))
  const unitOptions = units.map((u) => ({
    id: u.id,
    label: u.useAbbreviation && u.abbreviation ? u.abbreviation : u.name,
  }))

  // --- Image ---

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFormData((prev) => ({ ...prev, imageFile: file }))
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, imageFile: undefined }))
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // --- Ingredients ---

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      recipeIngredient: [
        ...prev.recipeIngredient,
        { quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" },
      ],
    }))
  }

  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipeIngredient: prev.recipeIngredient.filter((_, i) => i !== index),
    }))
  }

  const updateIngredientField = (index: number, patch: Partial<RecipeFormIngredient>) => {
    setFormData((prev) => ({
      ...prev,
      recipeIngredient: prev.recipeIngredient.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)),
    }))
  }

  // --- Instructions ---

  const addInstruction = () => {
    setFormData((prev) => ({
      ...prev,
      recipeInstructions: [...prev.recipeInstructions, { text: "" }],
    }))
  }

  const removeInstruction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipeInstructions: prev.recipeInstructions.filter((_, i) => i !== index),
    }))
  }

  const updateInstruction = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      recipeInstructions: prev.recipeInstructions.map((step, i) => (i === index ? { text: value } : step)),
    }))
  }

  // --- Submit ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    let result: MealieRecipe | null
    if (isEditing && recipe) {
      result = await updateRecipe(recipe.slug, formData)
    } else {
      result = await createRecipe(formData)
    }

    if (result) {
      navigate(`/recipes/${result.slug}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Photo */}
      <div className="space-y-2">
        <Label>Photo</Label>
        {imagePreview ? (
          <div className="relative w-full overflow-hidden rounded-xl aspect-video bg-muted">
            <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow backdrop-blur-sm hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 text-muted-foreground transition-colors hover:border-ring hover:bg-muted/50"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">Cliquer pour ajouter une photo</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="recipe-name">
          Titre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="recipe-name"
          type="text"
          placeholder="Nom de la recette"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required
          disabled={loading}
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="recipe-description">Description</Label>
        <textarea
          id="recipe-description"
          placeholder="Décrivez brièvement la recette…"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          disabled={loading}
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      {/* Temps */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recipe-prep-time">Préparation (min)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="recipe-prep-time"
              type="number"
              min="0"
              step="5"
              placeholder="15"
              value={formData.prepTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, prepTime: e.target.value }))}
              disabled={loading}
              className="w-24"
            />
            {formData.prepTime && (
              <span className="text-sm text-muted-foreground">{formatMinutes(formData.prepTime)}</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipe-cook-time">Cuisson (min)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="recipe-cook-time"
              type="number"
              min="0"
              step="5"
              placeholder="30"
              value={formData.cookTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, cookTime: e.target.value }))}
              disabled={loading}
              className="w-24"
            />
            {formData.cookTime && (
              <span className="text-sm text-muted-foreground">{formatMinutes(formData.cookTime)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Saisons */}
      <div className="space-y-2">
        <Label>Saisons</Label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((season: Season) => {
            const active = formData.seasons.includes(season)
            return (
              <Badge
                key={season}
                variant={active ? "default" : "outline"}
                className="cursor-pointer select-none transition-colors"
                onClick={() => {
                  if (loading) return
                  setFormData((prev) => ({
                    ...prev,
                    seasons: active ? prev.seasons.filter((s) => s !== season) : [...prev.seasons, season],
                  }))
                }}
              >
                {SEASON_LABELS[season]}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Catégories */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = formData.categories.some((c) => c.id === cat.id)
              return (
                <Badge
                  key={cat.id}
                  variant={active ? "default" : "outline"}
                  className="cursor-pointer select-none transition-colors"
                  onClick={() => {
                    if (loading) return
                    setFormData((prev) => ({
                      ...prev,
                      categories: active
                        ? prev.categories.filter((c) => c.id !== cat.id)
                        : [...prev.categories, { id: cat.id, name: cat.name, slug: cat.slug }],
                    }))
                  }}
                >
                  {cat.name}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Mots-clés */}
      {tags.filter((t) => !isSeasonTag(t)).length > 0 && (
        <div className="space-y-2">
          <Label>Mots-clés</Label>
          <div className="flex flex-wrap gap-2">
            {tags.filter((t) => !isSeasonTag(t)).map((tag) => {
              const active = formData.tags.some((t) => t.id === tag.id)
              return (
                <Badge
                  key={tag.id}
                  variant={active ? "secondary" : "outline"}
                  className="cursor-pointer select-none transition-colors"
                  onClick={() => {
                    if (loading) return
                    setFormData((prev) => ({
                      ...prev,
                      tags: active
                        ? prev.tags.filter((t) => t.id !== tag.id)
                        : [...prev.tags, { id: tag.id, name: tag.name, slug: tag.slug }],
                    }))
                  }}
                >
                  {tag.name}
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Ingrédients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ingrédients</Label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient} disabled={loading} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        <div className="hidden sm:grid sm:grid-cols-[16px_80px_1.5fr_1fr_32px] sm:gap-2 sm:items-center px-1">
          <span />
          <span className="text-xs text-muted-foreground font-medium">Qté</span>
          <span className="text-xs text-muted-foreground font-medium">Aliment</span>
          <span className="text-xs text-muted-foreground font-medium">Unité</span>
          <span />
        </div>

        <div className="space-y-2">
          {formData.recipeIngredient.map((ing, index) => (
            <div
              key={index}
              className="grid grid-cols-[16px_60px_1.5fr_1fr_32px] sm:grid-cols-[16px_80px_1.5fr_1fr_32px] gap-2 items-center"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />

              <Input
                type="text"
                inputMode="decimal"
                placeholder="Qté"
                value={ing.quantity}
                onChange={(e) => updateIngredientField(index, { quantity: e.target.value })}
                disabled={loading}
                className="min-w-0 px-2"
                aria-label={`Quantité ingrédient ${index + 1}`}
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
                placeholder="Aliment…"
                disabled={loading}
                allowCreate
                createLabel={(v) => `Créer "${v}"`}
                aria-label={`Aliment ingrédient ${index + 1}`}
              />

              <Autocomplete
                value={ing.unit}
                onChange={(value, option) =>
                  updateIngredientField(index, { unit: value, unitId: option?.id })
                }
                options={unitOptions}
                placeholder="Unité…"
                disabled={loading}
                aria-label={`Unité ingrédient ${index + 1}`}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                disabled={loading}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label={`Supprimer ingrédient ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Instructions</Label>
          <Button type="button" variant="outline" size="sm" onClick={addInstruction} disabled={loading} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        <div className="space-y-2">
          {formData.recipeInstructions.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-2 shrink-0 text-sm font-medium text-muted-foreground w-6 text-right">
                {index + 1}.
              </span>
              <textarea
                placeholder={`Étape ${index + 1}…`}
                value={step.text}
                onChange={(e) => updateInstruction(index, e.target.value)}
                disabled={loading}
                rows={2}
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                aria-label={`Étape ${index + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeInstruction(index)}
                disabled={loading}
                className="mt-1 h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={loading}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading || !formData.name.trim()}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? "Enregistrement…" : "Création…"}
            </>
          ) : isEditing ? (
            "Enregistrer"
          ) : (
            "Créer la recette"
          )}
        </Button>
      </div>
    </form>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function RecipeFormPage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const isEditing = Boolean(slug)

  // En mode édition, on charge la recette existante
  const { recipe, loading: recipeLoading, error: recipeError } = useRecipe(slug)

  const title = isEditing ? "Modifier la recette" : "Nouvelle recette"

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(isEditing && slug ? `/recipes/${slug}` : "/recipes")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-heading text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-8">
        {recipeLoading && <FormSkeleton />}

        {recipeError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {recipeError}
          </div>
        )}

        {(!isEditing || recipe) && !recipeLoading && (
          <RecipeFormContent
            key={`${isEditing ? "edit" : "new"}-${recipe?.id ?? "new"}`}
            recipe={recipe ?? undefined}
            isEditing={isEditing}
          />
        )}
      </div>
    </div>
  )
}
