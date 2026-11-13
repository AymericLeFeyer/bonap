import type { IToolRepository } from "../../../domain/organizer/repositories/IToolRepository.ts"
import type { MealieTool } from "../../../shared/types/mealie.ts"

export class GetToolsUseCase {
  private toolRepository: IToolRepository

  constructor(toolRepository: IToolRepository) {
    this.toolRepository = toolRepository
  }

  async execute(): Promise<MealieTool[]> {
    return this.toolRepository.getAll()
  }
}
