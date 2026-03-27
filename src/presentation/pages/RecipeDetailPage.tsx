import { Link, useNavigate, useParams } from "react-router-dom"
import { useRecipe } from "../hooks/useRecipe.ts"
import { useUpdateSeasons } from "../hooks/useUpdateSeasons.ts"
import { useUpdateCategories } from "../hooks/useUpdateCategories.ts"
import { useCategories } from "../hooks/useCategories.ts"
import { useFoods } from "../hooks/useFoods.ts"
import { useUnits } from "../hooks/useUnits.ts"
import { useRecipeForm } from "../hooks/useRecipeForm.ts"
import { Button } from "../components/ui/button.tsx"
import { Badge } from "../components/ui/badge.tsx"
import { Input } from "../components/ui/input.tsx"
import { SeasonBadge } from "../components/SeasonBadge.tsx"
import { Autocomplete } from "../components/ui/autocomplete.tsx"
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ImagePlus,
  Check,
  Pencil,
} from "lucide-react"
import { useState, useRef, useCallback, useEffect, type ReactNode, type ChangeEvent } from "react"
import type {
  MealieRecipe,
  MealieCategory,
  Season,
  RecipeFormData,
  RecipeFormIngredient,
  RecipeFormInstruction,
} from "../../shared/types/mealie.ts"
import { SEASONS, SEASON_LABELS } from "../../shared/types/mealie.ts"
import { getRecipeSeasonsFromTags, isSeasonTag } from "../../shared/utils/season.ts"
import { formatDuration } from "../../shared/utils/duration.ts"
import { cn } from "../../lib/utils.ts"

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

function buildFormData(recipe: MealieRecipe): RecipeFormData {
  const structured =
    recipe.recipeIngredient
      ?.filter(
        (ing) =>
          ing.food?.name || ing.unit?.name || (ing.quantity != null && ing.quantity !== 0) || ing.note,
      )
      .map((ing) => ({
        quantity: ing.quantity != null && ing.quantity !== 0 ? String(ing.quantity) : "",
        unit: ing.unit?.name ?? "",
        unitId: ing.unit?.id,
        food: ing.food?.name ?? "",
        foodId: ing.food?.id,
        note: ing.note ?? "",
      })) ?? []

  return {
    name: recipe.name,
    description: recipe.description ?? "",
    prepTime: parsePrepTimeToMinutes(recipe.prepTime),
    cookTime: parsePrepTimeToMinutes(recipe.cookTime),
    recipeIngredient: [
      ...structured,
      { quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" },
    ],
    recipeInstructions: recipe.recipeInstructions?.length
      ? recipe.recipeInstructions.map((s) => ({ text: s.text }))
      : [{ text: "" }],
    seasons: getRecipeSeasonsFromTags(recipe.tags),
    categories: (recipe.recipeCategory ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
    tags: (recipe.tags ?? [])
      .filter((t) => !isSeasonTag(t))
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
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

function RecipeDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="aspect-video w-full rounded-[var(--radius-xl)] bg-muted" />
      <div className="space-y-3">
        <div className="h-8 w-2/3 rounded-[var(--radius-md)] bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
        <div className="flex gap-4">
          <div className="h-5 w-32 rounded-[var(--radius-sm)] bg-muted" />
          <div className="h-5 w-32 rounded-[var(--radius-sm)] bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-6 w-32 rounded-[var(--radius-sm)] bg-muted" />
        <div className="h-4 w-full rounded-[var(--radius-sm)] bg-muted" />
        <div className="h-4 w-5/6 rounded-[var(--radius-sm)] bg-muted" />
        <div className="h-4 w-4/6 rounded-[var(--radius-sm)] bg-muted" />
      </div>
    </div>
  )
}

// ─── Inline editable field ─────────────────────────────────────────────────────

interface InlineEditTextProps {
  value: string
  displayValue?: ReactNode
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
  multiline?: boolean
  rows?: number
  as?: "h1" | "p" | "span"
  disabled?: boolean
}

function InlineEditText({
  value,
  displayValue,
  onChange,
  placeholder,
  className,
  inputClassName,
  multiline = false,
  rows = 3,
  as: Tag = "p",
  disabled = false,
}: InlineEditTextProps) {
  const [editing, setEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus()
        const len = textareaRef.current.value.length
        textareaRef.current.setSelectionRange(len, len)
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus()
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(len, len)
      }
    }
  }, [editing, multiline])

  const sharedInputClass = cn(
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
    inputClassName,
  )

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className={cn(sharedInputClass, "resize-none", className)}
        />
      )
    }
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(sharedInputClass, className)}
      />
    )
  }

  return (
    <Tag
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        "cursor-text rounded-md px-1 -mx-1 transition-colors",
        !disabled && "hover:bg-muted/50",
        !value && "text-muted-foreground italic",
        className,
      )}
      title={disabled ? undefined : "Cliquer pour modifier"}
    >
      {displayValue ?? (value || placeholder)}
    </Tag>
  )
}

// ─── Duration inline edit ──────────────────────────────────────────────────────

interface InlineEditDurationProps {
  label: string
  value: string
  displayRaw?: string
  onChange: (v: string) => void
  disabled?: boolean
}

function InlineEditDuration({ label, value, displayRaw, onChange, disabled }: InlineEditDurationProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <span className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground">{label} :</span>
        <Input
          ref={inputRef}
          type="number"
          min="0"
          step="5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          disabled={disabled}
          className="h-6 w-20 px-2 py-0 text-sm"
        />
        <span className="text-xs text-muted-foreground">min</span>
      </span>
    )
  }

  return (
    <span
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        "text-sm text-muted-foreground rounded px-1 -mx-1 transition-colors cursor-text",
        !disabled && "hover:bg-muted/50",
      )}
      title={disabled ? undefined : "Cliquer pour modifier"}
    >
      {label} : {displayRaw ? formatDuration(displayRaw) : (value ? formatMinutes(value) : "—")}
    </span>
  )
}

// ─── WYSIWYG Page ──────────────────────────────────────────────────────────────

export function RecipeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { recipe, loading, error, setRecipe } = useRecipe(slug)
  const { updateSeasons } = useUpdateSeasons()
  const { updateCategories } = useUpdateCategories()
  const { categories: allCategories } = useCategories()
  const { foods } = useFoods()
  const { units } = useUnits()
  const { updateRecipe, loading: saving, error: saveError } = useRecipeForm()

  // ─── Local editable state (initialized from recipe) ────────────────────────

  const [formData, setFormData] = useState<RecipeFormData | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialise formData once recipe is loaded
  useEffect(() => {
    if (recipe && !formData) {
      setFormData(buildFormData(recipe))
      setImagePreview(`/api/media/recipes/${recipe.id}/images/original.webp`)
    }
  }, [recipe, formData])

  const patch = useCallback((partial: Partial<RecipeFormData>) => {
    setFormData((prev) => (prev ? { ...prev, ...partial } : prev))
    setIsDirty(true)
  }, [])

  // ─── Image ─────────────────────────────────────────────────────────────────

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    patch({ imageFile: file })
    setImagePreview(URL.createObjectURL(file))
    setIsDirty(true)
  }

  // ─── Categories & Seasons (saved immediately, no dirty needed) ─────────────

  const handleToggleCategory = async (cat: MealieCategory) => {
    if (!recipe || !formData) return
    const current = formData.categories
    const isActive = current.some((c) => c.id === cat.id)
    const newCategories = isActive
      ? current.filter((c) => c.id !== cat.id)
      : [...current, { id: cat.id, name: cat.name, slug: cat.slug }]
    patch({ categories: newCategories })
    const updated = await updateCategories(recipe.slug, newCategories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      groupId: "",
    })))
    if (updated) setRecipe(updated)
  }

  const handleToggleSeason = async (season: Season) => {
    if (!recipe || !formData) return
    const currentSeasons = formData.seasons
    const newSeasons = currentSeasons.includes(season)
      ? currentSeasons.filter((s) => s !== season)
      : [...currentSeasons, season]
    patch({ seasons: newSeasons })
    const updated = await updateSeasons(recipe.slug, newSeasons)
    if (updated) setRecipe(updated)
  }

  // ─── Ingredients ───────────────────────────────────────────────────────────

  const addIngredient = () => {
    if (!formData) return
    patch({
      recipeIngredient: [
        ...formData.recipeIngredient,
        { quantity: "1", unit: "", unitId: undefined, food: "", foodId: undefined, note: "" },
      ],
    })
  }

  const removeIngredient = (index: number) => {
    if (!formData) return
    patch({ recipeIngredient: formData.recipeIngredient.filter((_, i) => i !== index) })
  }

  const updateIngredientField = (index: number, partial: Partial<RecipeFormIngredient>) => {
    if (!formData) return
    patch({
      recipeIngredient: formData.recipeIngredient.map((ing, i) =>
        i === index ? { ...ing, ...partial } : ing,
      ),
    })
  }

  // ─── Instructions ──────────────────────────────────────────────────────────

  const addInstruction = () => {
    if (!formData) return
    patch({
      recipeInstructions: [...formData.recipeInstructions, { text: "" }],
    })
  }

  const removeInstruction = (index: number) => {
    if (!formData) return
    patch({ recipeInstructions: formData.recipeInstructions.filter((_, i) => i !== index) })
  }

  const updateInstruction = (index: number, value: string) => {
    if (!formData) return
    patch({
      recipeInstructions: formData.recipeInstructions.map(
        (s, i): RecipeFormInstruction => (i === index ? { text: value } : s),
      ),
    })
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!recipe || !formData || !formData.name.trim()) return
    const updated = await updateRecipe(recipe.slug, formData)
    if (updated) {
      setRecipe(updated)
      setFormData(buildFormData(updated))
      setImagePreview(`/api/media/recipes/${updated.id}/images/original.webp`)
      setIsDirty(false)
    }
  }

  // ─── Options autocomplete ──────────────────────────────────────────────────

  const foodOptions = foods.map((f) => ({ id: f.id, label: f.name }))
  const unitOptions = units.map((u) => ({
    id: u.id,
    label: u.useAbbreviation && u.abbreviation ? u.abbreviation : u.name,
  }))

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/recipes">&larr; Recettes</Link>
        </Button>

        {isDirty && recipe && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFormData(buildFormData(recipe))
                setImagePreview(`/api/media/recipes/${recipe.id}/images/original.webp`)
                setIsDirty(false)
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || !formData?.name.trim()}
              className="gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        )}

        {!isDirty && recipe && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/recipes/${recipe.slug}/edit`)}
            className="gap-1.5 text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
            Formulaire complet
          </Button>
        )}
      </div>

      {/* Errors */}
      {saveError && (
        <div className="rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          {saveError}
        </div>
      )}

      {loading && <RecipeDetailSkeleton />}

      {error && (
        <div className="rounded-[var(--radius-xl)] border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {recipe && formData && (
        <article className="space-y-6">
          {/* Image */}
          <div
            className="group relative overflow-hidden rounded-[var(--radius-xl)] cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Cliquer pour changer la photo"
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt={recipe.name}
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

          {/* Titre */}
          <div className="space-y-3">
            <InlineEditText
              value={formData.name}
              displayValue={
                <span className="font-heading text-2xl font-bold leading-snug tracking-tight">
                  {formData.name}
                </span>
              }
              onChange={(v) => patch({ name: v })}
              placeholder="Nom de la recette"
              as="h1"
              inputClassName="font-heading text-2xl font-bold"
              disabled={saving}
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
                      onClick={() => void handleToggleCategory(cat)}
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
                      onClick={() => void handleToggleSeason(season)}
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
                displayRaw={recipe.prepTime}
                onChange={(v) => patch({ prepTime: v })}
                disabled={saving}
              />
              <InlineEditDuration
                label="Cuisson"
                value={formData.cookTime}
                displayRaw={recipe.cookTime}
                onChange={(v) => patch({ cookTime: v })}
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
                    disabled={saving}
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
                    disabled={saving}
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
                    disabled={saving}
                    aria-label={`Unité ingrédient ${index + 1}`}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    disabled={saving}
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
                      className={cn(
                        "w-full rounded-md border-transparent bg-transparent px-2 py-1 text-sm text-muted-foreground leading-relaxed",
                        "placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-input",
                        "focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring",
                        "hover:bg-muted/30 transition-colors resize-none",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                      )}
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

          {/* Sticky save bar when dirty */}
          {isDirty && (
            <div className="sticky bottom-4 flex justify-end gap-2 rounded-[var(--radius-xl)] border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData(buildFormData(recipe))
                  setImagePreview(`/api/media/recipes/${recipe.id}/images/original.webp`)
                  setIsDirty(false)
                }}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving || !formData.name.trim()}
                className="gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </div>
          )}
        </article>
      )}
    </div>
  )
}
