import { useState, useEffect } from "react"
import { Loader2, AlertCircle, Plus, Trash2, GripVertical } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog.tsx"
import { Input } from "./ui/input.tsx"
import { Button } from "./ui/button.tsx"
import { Label } from "./ui/label.tsx"
import { Badge } from "./ui/badge.tsx"
import { useRecipeForm } from "../hooks/useRecipeForm.ts"
import { useCategories } from "../hooks/useCategories.ts"
import { useTags } from "../hooks/useTags.ts"
import type { MealieRecipe, RecipeFormData, RecipeFormIngredient, RecipeFormInstruction, Season } from "../../shared/types/mealie.ts"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags, isSeasonTag } from "../../shared/utils/season.ts"

interface RecipeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe?: MealieRecipe
  onSuccess?: (recipe: MealieRecipe) => void
}

function buildInitialIngredients(recipe?: MealieRecipe): RecipeFormIngredient[] {
  if (!recipe?.recipeIngredient?.length) {
    return [{ quantity: "", unit: "", food: "", note: "" }]
  }
  return recipe.recipeIngredient.map((ing) => {
    // We save ingredients as plain text notes (to avoid Mealie's UUID requirement on food/unit).
    // If structured food/unit data exists (e.g. recipe imported via Mealie), flatten into note.
    if (ing.food?.name || ing.unit?.name) {
      const parts = [
        ing.quantity != null ? String(ing.quantity) : "",
        ing.unit?.name ?? "",
        ing.food?.name ?? "",
        ing.note ?? "",
      ].filter(Boolean)
      return { quantity: "", unit: "", food: "", note: parts.join(" ") }
    }
    return { quantity: "", unit: "", food: "", note: ing.note ?? "" }
  })
}

function buildInitialInstructions(recipe?: MealieRecipe): RecipeFormInstruction[] {
  if (!recipe?.recipeInstructions?.length) {
    return [{ text: "" }]
  }
  return recipe.recipeInstructions.map((step) => ({ text: step.text }))
}

function parsePrepTimeToMinutes(iso?: string): string {
  if (!iso) return ""
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return ""
  const hours = parseInt(match[1] ?? "0")
  const minutes = parseInt(match[2] ?? "0")
  const total = hours * 60 + minutes
  return total > 0 ? String(total) : ""
}

function buildInitialFormData(recipe?: MealieRecipe): RecipeFormData {
  return {
    name: recipe?.name ?? "",
    description: recipe?.description ?? "",
    prepTime: parsePrepTimeToMinutes(recipe?.prepTime),
    recipeIngredient: buildInitialIngredients(recipe),
    recipeInstructions: buildInitialInstructions(recipe),
    seasons: getRecipeSeasonsFromTags(recipe?.tags),
    categories: (recipe?.recipeCategory ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    tags: (recipe?.tags ?? []).filter((t) => !isSeasonTag(t)).map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  }
}

export function RecipeFormDialog({
  open,
  onOpenChange,
  recipe,
  onSuccess,
}: RecipeFormDialogProps) {
  const isEditing = Boolean(recipe)
  const { createRecipe, updateRecipe, loading, error } = useRecipeForm()
  const { categories } = useCategories()
  const { tags } = useTags()

  const [formData, setFormData] = useState<RecipeFormData>(() => buildInitialFormData(recipe))

  useEffect(() => {
    if (open) {
      setFormData(buildInitialFormData(recipe))
    }
  }, [open, recipe])

  const handleOpenChange = (value: boolean) => {
    if (!value && !loading) {
      onOpenChange(false)
    }
  }

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
      onOpenChange(false)
      onSuccess?.(result)
    }
  }

  // --- Ingredients ---

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      recipeIngredient: [...prev.recipeIngredient, { quantity: "", unit: "", food: "", note: "" }],
    }))
  }

  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recipeIngredient: prev.recipeIngredient.filter((_, i) => i !== index),
    }))
  }

  const updateIngredient = (index: number, field: keyof RecipeFormIngredient, value: string) => {
    setFormData((prev) => ({
      ...prev,
      recipeIngredient: prev.recipeIngredient.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing,
      ),
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
      recipeInstructions: prev.recipeInstructions.map((step, i) =>
        i === index ? { text: value } : step,
      ),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier la recette" : "Nouvelle recette"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de la recette."
              : "Remplissez les informations pour créer une nouvelle recette."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
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
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          {/* Prep time */}
          <div className="space-y-2">
            <Label htmlFor="recipe-prep-time">Temps de préparation (minutes)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="recipe-prep-time"
                type="number"
                min="0"
                step="5"
                placeholder="30"
                value={formData.prepTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, prepTime: e.target.value }))}
                disabled={loading}
                className="w-32"
              />
              {formData.prepTime && Number(formData.prepTime) > 0 && (
                <span className="text-sm text-muted-foreground">
                  {Number(formData.prepTime) >= 60
                    ? `${Math.floor(Number(formData.prepTime) / 60)}h${Number(formData.prepTime) % 60 > 0 ? `${Number(formData.prepTime) % 60}min` : ""}`
                    : `${formData.prepTime} min`}
                </span>
              )}
            </div>
          </div>

          {/* Seasons */}
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
                        seasons: active
                          ? prev.seasons.filter((s) => s !== season)
                          : [...prev.seasons, season],
                      }))
                    }}
                  >
                    {SEASON_LABELS[season]}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Categories */}
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

          {/* Tags */}
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

          {/* Ingredients */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingrédients</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
                disabled={loading}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {formData.recipeIngredient.map((ing, index) => (
                <div key={index} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    type="text"
                    placeholder="ex : 200 g de farine tamisée"
                    value={ing.note}
                    onChange={(e) => updateIngredient(index, "note", e.target.value)}
                    disabled={loading}
                    className="flex-1 min-w-0"
                    aria-label={`Ingrédient ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    disabled={loading || formData.recipeIngredient.length <= 1}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer ingrédient ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Instructions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInstruction}
                disabled={loading}
                className="gap-1.5"
              >
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
                    className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    aria-label={`Étape ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                    disabled={loading || formData.recipeInstructions.length <= 1}
                    className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Supprimer étape ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
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
      </DialogContent>
    </Dialog>
  )
}
