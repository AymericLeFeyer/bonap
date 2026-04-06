import type { IAuthRepository } from '../../../domain/auth/repositories/IAuthRepository.ts'
import type { AuthTokens } from '../../../domain/auth/entities/AuthTokens.ts'
import {
  getEnv,
  getIngressBasename,
  isDockerRuntime,
} from '../../../shared/utils/env.ts'
import { MealieApiError } from '../../../shared/types/errors.ts'

function getBaseUrl(): string {
  if (import.meta.env.DEV) return ''
  if (isDockerRuntime()) return getIngressBasename()
  return getEnv('VITE_MEALIE_URL').replace(/\/+$/, '')
}

export class AuthRepository implements IAuthRepository {
  async login(username: string, password: string): Promise<AuthTokens> {
    const url = `${getBaseUrl()}/api/auth/token`

    const body = new URLSearchParams()
    body.append('grant_type', '')
    body.append('username', username)
    body.append('password', password)
    body.append('scope', '')
    body.append('client_id', '')
    body.append('client_secret', '')

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText)
      throw new MealieApiError(
        response.status === 401 ? 'Identifiants invalides' : message,
        response.status,
      )
    }

    const data = (await response.json()) as {
      access_token: string
      token_type: string
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
    }
  }

  async logout(): Promise<void> {
    const url = `${getBaseUrl()}/api/auth/logout`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText)
      throw new MealieApiError(message, response.status)
    }
  }
}
