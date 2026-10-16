import type { Course, MealieCategory, MealieTag } from "../types/mealie.ts"
import { COURSES, DEFAULT_COURSE } from "../types/mealie.ts"

/**
 * Comme les saisons, Mealie ne connaît pas la notion d'entrée / plat / dessert :
 * elle est stockée en tags préfixés (ex: "type-dessert").
 */
export const COURSE_TAG_PREFIX = "type-"

export function courseTagName(course: Course): string {
  return `${COURSE_TAG_PREFIX}${course}`
}

export function isCourseTag(tag: Pick<MealieTag, "name">): boolean {
  return tag.name.startsWith(COURSE_TAG_PREFIX)
    && COURSES.includes(tag.name.slice(COURSE_TAG_PREFIX.length) as Course)
}

/** Remet les types dans l'ordre du repas et retire les doublons. */
export function sortCourses(courses: Course[]): Course[] {
  return COURSES.filter((c) => courses.includes(c))
}

export function getCoursesFromTags(tags: Pick<MealieTag, "name">[] | undefined): Course[] {
  if (!tags?.length) return []
  return sortCourses(
    tags.filter(isCourseTag).map((t) => t.name.slice(COURSE_TAG_PREFIX.length) as Course),
  )
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

const COURSE_LABEL_PATTERNS: Array<[Course, RegExp]> = [
  ["entree", /\b(entrees?|starters?|appetizers?)\b/],
  ["plat", /\b(plats? principa(l|ux)|main (course|dish)e?s?)\b/],
  ["dessert", /\b(desserts?|patisseries?)\b/],
]

/**
 * Devine le type à partir des catégories / tags existants ("Desserts",
 * "Entrées"…) pour qu'un catalogue déjà organisé fonctionne sans retaguer.
 * Retourne null si rien ne correspond.
 */
export function inferCoursesFromLabels(labels: string[]): Course[] | null {
  const normalized = labels.map(normalizeLabel)
  const found = COURSE_LABEL_PATTERNS
    .filter(([, re]) => normalized.some((label) => re.test(label)))
    .map(([course]) => course)
  return found.length > 0 ? found : null
}

interface RecipeCourseSource {
  tags?: Pick<MealieTag, "name">[]
  recipeCategory?: Pick<MealieCategory, "name">[]
}

function recipeLabels(recipe: RecipeCourseSource): string[] {
  return [
    ...(recipe.recipeCategory ?? []).map((c) => c.name),
    ...(recipe.tags ?? []).filter((t) => !isCourseTag(t)).map((t) => t.name),
  ]
}

/**
 * Types d'une recette. Priorité : tags `type-` > catégories / tags évocateurs
 * > plat par défaut. Toujours au moins un élément.
 */
export function getRecipeCourses(recipe: RecipeCourseSource | undefined | null): Course[] {
  if (!recipe) return [DEFAULT_COURSE]
  const explicit = getCoursesFromTags(recipe.tags)
  if (explicit.length > 0) return explicit
  return inferCoursesFromLabels(recipeLabels(recipe)) ?? [DEFAULT_COURSE]
}

export function recipeHasCourse(recipe: RecipeCourseSource | undefined | null, course: Course): boolean {
  return getRecipeCourses(recipe).includes(course)
}

/** Type sous lequel planifier la recette par défaut : plat dès qu'elle peut en être un. */
export function getPrimaryCourse(recipe: RecipeCourseSource | undefined | null): Course {
  const courses = getRecipeCourses(recipe)
  return courses.includes(DEFAULT_COURSE) ? DEFAULT_COURSE : courses[0]
}

/** Ajoute / retire un type en gardant toujours au moins un type sélectionné. */
export function toggleCourse(current: Course[], course: Course): Course[] {
  const next = current.includes(course)
    ? current.filter((c) => c !== course)
    : [...current, course]
  return next.length > 0 ? sortCourses(next) : current
}

/**
 * Noms des tags `type-` à écrire pour obtenir `courses`. Aucun tag quand les
 * catégories / tags de la recette donnent déjà ce résultat (cas courant : un
 * plat sans indication), pour ne pas ajouter un tag à chaque recette.
 */
export function courseTagNamesToWrite(courses: Course[], recipe: RecipeCourseSource): string[] {
  const wanted = sortCourses(courses.length > 0 ? courses : [DEFAULT_COURSE])
  const withoutTags = inferCoursesFromLabels(recipeLabels(recipe)) ?? [DEFAULT_COURSE]
  const same = wanted.length === withoutTags.length && wanted.every((c) => withoutTags.includes(c))
  return same ? [] : wanted.map(courseTagName)
}

/** Tags de la recette avec ces types appliqués (affichage optimiste avant la réponse serveur). */
export function withCourseTags<T extends { tags?: MealieTag[] }>(recipe: T, courses: Course[]): T {
  return {
    ...recipe,
    tags: [
      ...(recipe.tags ?? []).filter((t) => !isCourseTag(t)),
      ...courses.map((c) => ({ id: "", name: courseTagName(c), slug: courseTagName(c) })),
    ],
  }
}
