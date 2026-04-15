import type { MealieInstruction } from "../../shared/types/mealie.ts"
import { MarkdownContent } from "./MarkdownContent.tsx"

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
    <section className="space-y-4">
      <h2 className={`font-heading ${headingSize} font-bold tracking-tight`}>Instructions</h2>
      <ol className="space-y-5">
        {instructions.map((step, i) => (
          <li key={step.id} className="flex gap-3">
            {/* Numéro d'étape */}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/8 text-[11px] font-bold text-primary mt-0.5">
              {i + 1}
            </span>
            <div className="space-y-0.5 flex-1">
              {step.title && (
                <p className="text-sm font-semibold">{step.title}</p>
              )}
              <MarkdownContent>{step.text ?? ""}</MarkdownContent>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
