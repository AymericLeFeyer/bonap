import type { IMealieApiClient } from "./IMealieApiClient.ts"
import {
  MealieApiError,
  MealieNotFoundError,
  MealieServerError,
  MealieUnauthorizedError,
} from "../../../shared/types/errors.ts"
import { getEnv, getIngressBasename, isDockerRuntime } from "../../../shared/utils/env.ts"
import { compressImage } from "../../../shared/utils/imageCompression.ts"

// En dev : /api est proxié par Vite → VITE_MEALIE_URL (pas de CORS).
// En prod Docker standard : /api est proxié par nginx → VITE_MEALIE_URL.
// En prod HA addon : nginx est accessible via l'ingress path, les appels doivent
//   être préfixés par /api/hassio_ingress/<token> pour passer par HA.
// En prod sans Docker : requête directe vers VITE_MEALIE_URL depuis le navigateur.
function getBaseUrl(): string {
  if (import.meta.env.DEV) return ""
  if (isDockerRuntime()) return getIngressBasename()
  return getEnv("VITE_MEALIE_URL").replace(/\/+$/, "")
}

function getToken(): string {
  return getEnv("VITE_MEALIE_TOKEN")
}

export class MealieApiClient implements IMealieApiClient {
  private extractErrorMessage(payload: unknown, status: number, statusText: string): string {
    if (typeof payload === "string") {
      const raw = payload.trim()
      if (!raw) return `HTTP ${status}${statusText ? ` ${statusText}` : ""}`

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        const detail = parsed.detail

        if (typeof detail === "string" && detail.trim()) return detail.trim()
        if (detail && typeof detail === "object") {
          const detailMessage = (detail as Record<string, unknown>).message
          if (typeof detailMessage === "string" && detailMessage.trim()) return detailMessage.trim()
        }

        const topMessage = parsed.message
        if (typeof topMessage === "string" && topMessage.trim()) return topMessage.trim()

        const title = parsed.title
        if (typeof title === "string" && title.trim()) return title.trim()
      } catch {
        return raw
      }

      return raw
    }

    if (payload && typeof payload === "object") {
      const obj = payload as Record<string, unknown>

      if (typeof obj.detail === "string" && obj.detail.trim()) return obj.detail.trim()
      if (obj.detail && typeof obj.detail === "object") {
        const detailMessage = (obj.detail as Record<string, unknown>).message
        if (typeof detailMessage === "string" && detailMessage.trim()) return detailMessage.trim()
      }
      if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim()
      if (typeof obj.error === "string" && obj.error.trim()) return obj.error.trim()
      if (typeof obj.title === "string" && obj.title.trim()) return obj.title.trim()
    }

    return `HTTP ${status}${statusText ? ` ${statusText}` : ""}`
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${getBaseUrl()}${path}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const raw = await response.text().catch(() => "")
      const message = this.extractErrorMessage(raw, response.status, response.statusText)

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
    const compressed = await compressImage(file)
    const formData = new FormData()
    formData.append("image", compressed)
    formData.append("extension", compressed.name.split(".").pop() ?? "jpg")
    const url = `${getBaseUrl()}/api/recipes/${slug}/image`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    })
    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText)
      throw new MealieApiError(message, response.status)
    }
  }

  async postSse<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
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
