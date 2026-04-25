import type { Brigade, BrigadeWithCounts, BrigadeStatus } from '../entities/Brigade'

export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface CreateBrigadeData {
  name: string
  description: string | null
  location: string
  date: Date
  createdBy: string
  creatorEmail: string
}

export interface UpdateBrigadeData {
  name?: string
  description?: string | null
  location?: string
  date?: Date
  status?: BrigadeStatus
  openedAt?: Date | null
  closedAt?: Date | null
}

export interface IBrigadeRepository {
  findById(id: string, userId: string): Promise<Brigade | null>
  findAllByUserId(userId: string): Promise<BrigadeWithCounts[]>
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  create(data: CreateBrigadeData): Promise<Brigade>
  update(id: string, data: UpdateBrigadeData): Promise<Brigade>
}
