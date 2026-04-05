import type { AuthTokens } from '../entities/AuthTokens.ts'

export interface IAuthRepository {
  login(username: string, password: string): Promise<AuthTokens>
  logout(): Promise<void>
}
