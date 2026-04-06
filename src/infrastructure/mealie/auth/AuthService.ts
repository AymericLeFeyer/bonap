import { mealieApiClient } from "../api/index.ts"

export class AuthService {
  private userId: string | null = null

  async getUserId(): Promise<string> {
    if (this.userId) return this.userId

    const res = await mealieApiClient.get<{ id: string }>("/api/users/self")

    this.userId = res.id
    return res.id
  }
}