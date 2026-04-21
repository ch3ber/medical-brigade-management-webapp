import type { Area } from '../../domain/entities/Area'
import type { IAreaRepository, UpdateAreaData } from '../../domain/repositories/IAreaRepository'

interface UpdateAreaDto {
  brigadeId: string
  areaId: string
  userId: string
  data: UpdateAreaData
}

export class UpdateAreaUseCase {
  constructor(private readonly repo: IAreaRepository) {}

  async execute({ brigadeId, areaId, userId, data }: UpdateAreaDto): Promise<Area> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const area = await this.repo.findById(areaId, brigadeId)
    if (!area) throw new Error('AREA_NO_ENCONTRADA')

    return this.repo.update(areaId, data)
  }
}
