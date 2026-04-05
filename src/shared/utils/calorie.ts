const PREFIX = "calorie-"

export function buildCalorieTag(calories: number): string {
  return `${PREFIX}${calories}`
}

export function isCalorieTag(tag: { slug: string }): boolean {
  return tag.slug.startsWith(PREFIX)
}

export function getCaloriesFromTags(
  tags?: { slug: string }[],
): number | null {
  if (!tags?.length) return null

  const tag = tags.find(t => t.slug.startsWith(PREFIX))
  if (!tag) return null

  const value = Number(tag.slug.replace(PREFIX, ""))
  return isNaN(value) ? null : value
}