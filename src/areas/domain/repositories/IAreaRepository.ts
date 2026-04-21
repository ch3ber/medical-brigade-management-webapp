import type { Area, AreaWithCounts } from '../entities/Area'

export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface CreateAreaData {
  brigadeId: string
  name: string
  prefix: string
  color: string
  patientLimit: number | null
  order: number
}

export interface UpdateAreaData {
  name?: string
  prefix?: string
  color?: string
  patientLimit?: number | null
  order?: number
}

export interface IAreaRepository {
  findAllByBrigade(brigadeId: string, userId: string): Promise<AreaWithCounts[]>
  findById(id: string, brigadeId: string): Promise<Area | null>
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  getMaxOrder(brigadeId: string): Promise<number>
  create(data: CreateAreaData): Promise<Area>
  update(id: string, data: UpdateAreaData): Promise<Area>
  softDelete(id: string): Promise<void>
  hasActiveTurnos(id: string): Promise<boolean>
}
