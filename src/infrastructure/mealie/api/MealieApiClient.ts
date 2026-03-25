import type { IMealieApiClient } from "./IMealieApiClient.ts"
import {
  MealieApiError,
  MealieNotFoundError,
  MealieServerError,
  MealieUnauthorizedError,
} from "../../../shared/types/errors.ts"

// In dev, /api requests are proxied by Vite to VITE_MEALIE_URL (no CORS).
// In prod, VITE_MEALIE_URL must be set and directly reachable.
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

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body)
  }

  async delete(path: string): Promise<void> {
    await this.request<void>("DELETE", path)
  }

  async uploadImage(slug: string, file: File): Promise<void> {
    const formData = new FormData()
    formData.append("image", file)
    formData.append("extension", file.name.split(".").pop() ?? "jpg")
    const url = `${baseUrl}/api/recipes/${slug}/image`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText)
      throw new MealieApiError(message, response.status)
    }
  }

  async postSse<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok || !response.body) {
      const message = await response.text().catch(() => response.statusText)
      throw new MealieApiError(message, response.status)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let last: T | undefined

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue
        try {
          last = JSON.parse(line.slice(6)) as T
        } catch { /* ignore malformed SSE lines */ }
      }
    }

    if (last === undefined) throw new MealieApiError("SSE stream ended with no data", 0)
    return last
  }
}
