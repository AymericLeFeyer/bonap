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
import type { MealieRecipe, RecipeFormData, RecipeFormIngredient, RecipeFormInstruction, Season } from "../../shared/types/mealie.ts"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags } from "../../shared/utils/season.ts"

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
  return recipe.recipeIngredient.map((ing) => ({
    quantity: ing.quantity != null ? String(ing.quantity) : "",
    unit: ing.unit?.name ?? "",
    food: ing.food?.name ?? "",
    note: ing.note ?? "",
  }))
}

function buildInitialInstructions(recipe?: MealieRecipe): RecipeFormInstruction[] {
  if (!recipe?.recipeInstructions?.length) {
    return [{ text: "" }]
  }
  return recipe.recipeInstructions.map((step) => ({ text: step.text }))
}

function buildInitialFormData(recipe?: MealieRecipe): RecipeFormData {
  return {
    name: recipe?.name ?? "",
    description: recipe?.description ?? "",
    prepTime: recipe?.prepTime ?? "",
    recipeIngredient: buildInitialIngredients(recipe),
    recipeInstructions: buildInitialInstructions(recipe),
    seasons: getRecipeSeasonsFromTags(recipe?.tags),
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
          {/* Titre */}
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
            <Label htmlFor="recipe-prep-time">Temps de préparation</Label>
            <Input
              id="recipe-prep-time"
              type="text"
              placeholder="Ex: PT30M (30 min) ou PT1H30M (1h30)"
              value={formData.prepTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, prepTime: e.target.value }))}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Format ISO 8601 : PT30M = 30 minutes, PT1H = 1 heure
            </p>
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
                    placeholder="Qté"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                    disabled={loading}
                    className="w-16 shrink-0"
                    aria-label={`Quantité ingrédient ${index + 1}`}
                  />
                  <Input
                    type="text"
                    placeholder="Unité"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                    disabled={loading}
                    className="w-24 shrink-0"
                    aria-label={`Unité ingrédient ${index + 1}`}
                  />
                  <Input
                    type="text"
                    placeholder="Ingrédient"
                    value={ing.food}
                    onChange={(e) => updateIngredient(index, "food", e.target.value)}
                    disabled={loading}
                    className="flex-1 min-w-0"
                    aria-label={`Nom ingrédient ${index + 1}`}
                  />
                  <Input
                    type="text"
                    placeholder="Note"
                    value={ing.note}
                    onChange={(e) => updateIngredient(index, "note", e.target.value)}
                    disabled={loading}
                    className="w-28 shrink-0"
                    aria-label={`Note ingrédient ${index + 1}`}
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

          {/* Erreur */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
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
