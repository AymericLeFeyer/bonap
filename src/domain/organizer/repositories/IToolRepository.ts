import type { MealieTool } from "../../../shared/types/mealie.ts"

export interface IToolRepository {
  getAll(): Promise<MealieTool[]>
}
