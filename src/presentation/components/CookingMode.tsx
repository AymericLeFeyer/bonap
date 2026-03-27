import { useState, useEffect, useRef } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./ui/button.tsx"
import { cn } from "../../lib/utils.ts"
import type { MealieIngredient, MealieInstruction } from "../../shared/types/mealie.ts"

interface CookingModeProps {
  recipeName: string
  ingredients: MealieIngredient[]
  instructions: MealieInstruction[]
  onClose: () => void
}

export function CookingMode({ recipeName, ingredients, instructions, onClose }: CookingModeProps) {
  // step -1 = ingrédients, 0..N-1 = instructions
  const [step, setStep] = useState(-1)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const totalSteps = instructions.length
  const isIngredients = step === -1
  const isLast = step === totalSteps - 1

  // Wake lock
  useEffect(() => {
    if ("wakeLock" in navigator) {
      navigator.wakeLock.request("screen").then((lock) => {
        wakeLockRef.current = lock
      }).catch(() => {})
    }
    return () => {
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (!isLast) setStep((s) => s + 1)
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (step > -1) setStep((s) => s - 1)
      } else if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [step, isLast, onClose])

  const currentInstruction = !isIngredients ? instructions[step] : null

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex flex-col bg-background" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <span className="truncate text-sm font-medium text-muted-foreground">{recipeName}</span>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="text-sm text-muted-foreground">
            {isIngredients ? "Ingrédients" : `Étape ${step + 1} / ${totalSteps}`}
          </span>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-muted shrink-0">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: isIngredients ? "0%" : `${((step + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-xl">
          {isIngredients ? (
            <IngredientsScreen ingredients={ingredients} />
          ) : (
            <InstructionScreen
              step={step + 1}
              total={totalSteps}
              instruction={currentInstruction!}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-border px-6 py-4 shrink-0">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={isIngredients}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 0 ? "Ingrédients" : "Précédent"}
        </Button>

        {!isLast ? (
          <Button onClick={() => setStep((s) => s + 1)} className="gap-2">
            {isIngredients ? "Commencer" : "Suivant"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose} className="gap-2 text-green-700 border-green-200 hover:bg-green-50 dark:hover:bg-green-950">
            Terminé !
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Ingrédients screen ───────────────────────────────────────────────────────

function IngredientsScreen({ ingredients }: { ingredients: MealieIngredient[] }) {
  const filtered = ingredients.filter(
    (ing) => ing.food?.name || ing.note || (ing.quantity != null && ing.quantity !== 0),
  )

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-3xl font-bold tracking-tight">Ingrédients</h2>
      <ul className="space-y-4">
        {filtered.map((ing, i) => (
          <li key={i} className="flex items-baseline gap-2 text-xl">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary mt-2.5" />
            {ing.quantity != null && ing.quantity !== 0 && (
              <span className="font-semibold tabular-nums">{ing.quantity}</span>
            )}
            {ing.unit?.name && (
              <span className="text-muted-foreground">{ing.unit.name}</span>
            )}
            {ing.food?.name && <span className="font-medium">{ing.food.name}</span>}
            {ing.note && <span className="text-muted-foreground text-base"> — {ing.note}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Instruction screen ───────────────────────────────────────────────────────

function InstructionScreen({
  step,
  total,
  instruction,
}: {
  step: number
  total: number
  instruction: MealieInstruction
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground font-heading text-2xl font-bold",
          )}
        >
          {step}
        </span>
        <span className="text-base text-muted-foreground">sur {total}</span>
      </div>

      {instruction.title && (
        <h3 className="font-heading text-2xl font-semibold">{instruction.title}</h3>
      )}
      <p className="text-2xl leading-relaxed text-foreground">{instruction.text}</p>
    </div>
  )
}
