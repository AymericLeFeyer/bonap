const KEY = "bonap:recipe_emojis"

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>
  } catch {
    return {}
  }
}

export const recipeEmojiStore = {
  set(recipeId: string, emoji: string): void {
    const store = load()
    store[recipeId] = emoji
    localStorage.setItem(KEY, JSON.stringify(store))
  },
  remove(recipeId: string): void {
    const store = load()
    delete store[recipeId]
    localStorage.setItem(KEY, JSON.stringify(store))
  },
  get(recipeId: string): string | null {
    return load()[recipeId] ?? null
  },
}
