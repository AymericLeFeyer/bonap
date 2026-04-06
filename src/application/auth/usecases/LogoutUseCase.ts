import type { IAuthRepository } from '../../../domain/auth/repositories/IAuthRepository.ts'

export class LogoutUseCase {
  private authRepository: IAuthRepository

  constructor(authRepository: IAuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<void> {
    await this.authRepository.logout()
  }
}
