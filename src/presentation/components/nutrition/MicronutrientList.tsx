import type { DisplayedMicronutrient } from "../../../shared/utils/micronutrients.ts"

/** Micronutriments de la fiche recette. Une valeur absente n'est pas un zéro. */
export function MicronutrientList({ micronutrients }: { micronutrients: DisplayedMicronutrient[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3" aria-label="Micronutriments">
      {micronutrients.map(({ field, label, unit, value }) => (
        <div key={field} className="flex items-baseline justify-between gap-2">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className={value === null ? "italic text-muted-foreground/70" : "font-medium tabular-nums"}>
            {value === null ? "non renseigné" : `${value} ${unit}`}
          </dd>
        </div>
      ))}
    </dl>
  )
}
