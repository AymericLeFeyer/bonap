import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Node ≥ 25 expose un `localStorage` global expérimental qui vaut `undefined`
// sans `--localstorage-file`, et masque celui de jsdom. On remet un stockage
// en mémoire pour que les tests se comportent comme dans le navigateur.
if (typeof globalThis.localStorage?.clear !== "function") {
  const store = new Map<string, string>()
  const memoryStorage: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStorage,
  })
}

afterEach(() => {
  cleanup()
})
