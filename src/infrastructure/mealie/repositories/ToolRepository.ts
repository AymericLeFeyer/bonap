import type { IToolRepository } from "../../../domain/organizer/repositories/IToolRepository.ts"
import type { MealieTool } from "../../../shared/types/mealie.ts"
import { mealieApiClient } from "../api/index.ts"

interface RawToolsResponse {
  items: MealieTool[]
}

export class ToolRepository implements IToolRepository {
  async getAll(): Promise<MealieTool[]> {
    const data = await mealieApiClient.get<RawToolsResponse>(
      "/api/organizers/tools?page=1&perPage=-1&orderBy=name&orderDirection=asc",
    )
    return data.items
  }
}
