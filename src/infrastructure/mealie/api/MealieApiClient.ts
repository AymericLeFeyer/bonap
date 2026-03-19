import type { IMealieApiClient } from "../../../domain/recipe/repositories/IMealieApiClient.ts"
import {
  MealieApiError,
  MealieNotFoundError,
  MealieServerError,
  MealieUnauthorizedError,
} from "../../../shared/types/errors.ts"

// En dev, les requêtes /api sont proxifiées par Vite vers VITE_MEALIE_URL (pas de CORS).
// En prod, VITE_MEALIE_URL doit être renseigné et accessible directement.
const baseUrl =
  import.meta.env.DEV
    ? ""
    : (import.meta.env.VITE_MEALIE_URL as string).replace(/\/+$/, "")
const token = import.meta.env.VITE_MEALIE_TOKEN as string

export class MealieApiClient implements IMealieApiClient {
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${baseUrl}${path}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText)

      if (response.status === 401) {
        throw new MealieUnauthorizedError(message)
      }
      if (response.status === 404) {
        throw new MealieNotFoundError(message)
      }
      if (response.status >= 500) {
        throw new MealieServerError(message, response.status)
      }
      throw new MealieApiError(message, response.status)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path)
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body)
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PUT", path, body)
  }

  async delete(path: string): Promise<void> {
    await this.request<void>("DELETE", path)
  }
}
