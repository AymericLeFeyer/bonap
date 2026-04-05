import type { IAuthRepository } from '../../../domain/auth/repositories/IAuthRepository.ts'
import type { AuthTokens } from '../../../domain/auth/entities/AuthTokens.ts'

export class LoginUseCase {
  private authRepository: IAuthRepository

  constructor(authRepository: IAuthRepository) {
    this.authRepository = authRepository
  }

  async execute(username: string, password: string): Promise<AuthTokens> {
    return this.authRepository.login(username, password)
  }
}
