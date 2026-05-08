import { useState, useCallback } from "react"
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react"
import { Input } from "./ui/input.tsx"
import { Button } from "./ui/button.tsx"
import { Label } from "./ui/label.tsx"
import { Autocomplete } from "./ui/autocomplete.tsx"
import { useFoods } from "../hooks/useFoods.ts"
import { useTags } from "../hooks/useTags.ts"
import { createRecipeUseCase } from "../../infrastructure/container.ts"
import { mealieApiClient } from "../../infrastructure/mealie/api/index.ts"
import type { MealieRecipe, RecipeFormIngredient } from "../../shared/types/mealie.ts"
import { randomFoodEmoji, getSupportedFoodEmojis, getUnsupportedEmojiCount, EXTRAS_EMOJI_KEY, SIMPLE_RECIPE_TAG_SLUG } from "../../shared/utils/recipeEmoji.ts"
import { recipeEmojiStore } from "../../infrastructure/recipe/RecipeEmojiStore.ts"
import { cn } from "../../lib/utils.ts"

interface SimpleRecipePickerProps {
  onCreated: (recipe: MealieRecipe) => void
  dropdownContainer?: HTMLElement | null
}

function buildEmptyIngredient(): RecipeFormIngredient {
  return { quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" }
}

export function SimpleRecipePicker({ onCreated, dropdownContainer }: SimpleRecipePickerProps) {
  const { foods } = useFoods()
  const { tags } = useTags()

  const [name, setName] = useState("")
  const [nameEditedManually, setNameEditedManually] = useState(false)
  const [emoji, setEmoji] = useState(() => randomFoodEmoji())
  const [ingredients, setIngredients] = useState<RecipeFormIngredient[]>([buildEmptyIngredient()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const foodOptions = foods.map((f) => ({ id: f.id, label: f.name }))

  const updateIngredient = (index: number, patch: Partial<RecipeFormIngredient>) => {
    setIngredients((prev) => {
      const next = prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing))
      if (!nameEditedManually) {
        const parts = next.map((ing) => ing.food.trim()).filter(Boolean)
        setName(parts.join(", "))
      }
      return next
    })
  }

  const addIngredient = () => setIngredients((prev) => [...prev, buildEmptyIngredient()])

  const removeIngredient = (index: number) => {
    setIngredients((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (!nameEditedManually) {
        const parts = next.map((ing) => ing.food.trim()).filter(Boolean)
        setName(parts.join(", "))
      }
      return next
    })
  }

  const resolveSimpleTag = useCallback(async (): Promise<{ id: string; name: string; slug: string }> => {
    const existing = tags.find((t) => t.slug === SIMPLE_RECIPE_TAG_SLUG)
    if (existing) return { id: existing.id, name: existing.name, slug: existing.slug }
    return mealieApiClient.post<{ id: string; name: string; slug: string }>(
      "/api/organizers/tags",
      { name: SIMPLE_RECIPE_TAG_SLUG },
    )
  }, [tags])

  const handleCreate = async () => {
    const finalName = name.trim() || "Repas simple"
    const finalEmoji = emoji.trim() || randomFoodEmoji()
    setLoading(true)
    setError(null)
    try {
      const simpleTag = await resolveSimpleTag()
      const recipe = await createRecipeUseCase.execute({
        name: finalName,
        description: "",
        prepTime: "",
        performTime: "",
        totalTime: "",
        recipeIngredient: ingredients,
        recipeInstructions: [],
        seasons: [],
        categories: [],
        tags: [simpleTag],
        extras: { [EXTRAS_EMOJI_KEY]: finalEmoji },
      })
      recipeEmojiStore.set(recipe.id, recipe.extras?.[EXTRAS_EMOJI_KEY] ?? "")
      onCreated(recipe)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le repas simple.")
    } finally {
      setLoading(false)
    }
  }

  const hasIngredients = ingredients.some((ing) => ing.food.trim())

  return (
    <div className="space-y-5">
      {/* 1. Ingrédients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ingrédients</Label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient} disabled={loading} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>

        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Autocomplete
                value={ing.food}
                onChange={(value, option) => updateIngredient(index, {
                  food: value,
                  foodId: option && option.id !== "__create__" ? option.id : undefined,
                })}
                options={foodOptions}
                placeholder="Aliment…"
                disabled={loading}
                className="flex-1"
                portalContainer={dropdownContainer}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                disabled={loading || ingredients.length <= 1}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Quantité par défaut : 1, sans unité.
        </p>
      </div>

      {/* 2. Nom */}
      <div className="space-y-1.5">
        <Label htmlFor="simple-name">Nom du repas</Label>
        <Input
          id="simple-name"
          placeholder="Généré automatiquement depuis les ingrédients"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setNameEditedManually(true)
          }}
          disabled={loading}
        />
      </div>

      {/* 3. Emoji */}
      <div className="space-y-2">
        <Label>Emoji</Label>
        <div className="flex flex-wrap gap-2">
          {getSupportedFoodEmojis().map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              disabled={loading}
              className={cn(
                "h-9 w-9 rounded-md border text-xl transition-colors",
                emoji === e
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary",
              )}
            >
              {e}
            </button>
          ))}
        </div>
        {getUnsupportedEmojiCount() > 0 && (
          <p className="text-xs text-muted-foreground">
            {getUnsupportedEmojiCount()} emoji{getUnsupportedEmojiCount() > 1 ? "s" : ""} masqué{getUnsupportedEmojiCount() > 1 ? "s" : ""} — non disponibles sur cet appareil.
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        className="w-full gap-2"
        onClick={() => void handleCreate()}
        disabled={loading || !hasIngredients}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Création en cours…" : "Créer et ajouter au planning"}
      </Button>
    </div>
  )
}
