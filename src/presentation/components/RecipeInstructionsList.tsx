import type { MealieInstruction } from "../../shared/types/mealie.ts"

interface RecipeInstructionsListProps {
  instructions: MealieInstruction[]
  /** Heading size class — defaults to "text-lg" */
  headingSize?: "text-lg" | "text-base"
}

export function RecipeInstructionsList({
  instructions,
  headingSize = "text-lg",
}: RecipeInstructionsListProps) {
  if (instructions.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className={`${headingSize} font-semibold`}>Instructions</h2>
      <ol className="space-y-4">
        {instructions.map((step, i) => (
          <li key={step.id} className="space-y-1">
            <p className="text-sm font-medium">
              Étape {i + 1}
              {step.title && ` — ${step.title}`}
            </p>
            <p className="text-sm text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
