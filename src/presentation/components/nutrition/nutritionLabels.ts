import type { NutritionLineReason } from "../../../domain/nutrition/entities/NutritionFood.ts"

export const LINE_REASON_LABELS: Record<NutritionLineReason, string> = {
  negligible: "Négligeable",
  "vague-quantity": "Quantité vague, négligeable",
  "no-match": "Aucune correspondance fiable",
  "piece-weight-missing": "Poids d'une pièce à saisir",
  "unit-unknown": "Unité non convertible en grammes",
  "no-nutrients": "Aucun nutriment (CIQUAL ni Open Food Facts)",
}
