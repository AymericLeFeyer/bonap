/** Recette soumise à l'IA pour savoir si elle se prête au batch cooking. */
export interface BatchCandidate {
  slug: string
  name: string
  /** Catégories / tags utiles au jugement (« Gratins », « Soupes »…). */
  labels: string[]
}

export interface BatchAdvice {
  slug: string
  /** Jours de conservation au frigo une fois cuisiné. */
  fridgeDays?: number
  /** Jours de conservation au congélateur ; absent = ne se congèle pas bien. */
  freezerDays?: number
  reason?: string
}

/** Identifie, parmi des recettes, celles qui se cuisinent à l'avance. */
export interface IBatchAdvisor {
  adviseBatchRecipes(candidates: BatchCandidate[]): Promise<BatchAdvice[]>
}
