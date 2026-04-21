import type { Area } from '../../domain/entities/Area'
import type { IAreaRepository } from '../../domain/repositories/IAreaRepository'

interface CloneAreaDto {
  brigadeId: string
  areaId: string
  userId: string
  targetBrigadeId: string
}

export class CloneAreaUseCase {
  constructor(private readonly repo: IAreaRepository) {}

  async execute({ brigadeId, areaId, userId, targetBrigadeId }: CloneAreaDto): Promise<Area> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const area = await this.repo.findById(areaId, brigadeId)
    if (!area) throw new Error('AREA_NO_ENCONTRADA')

    const order = (await this.repo.getMaxOrder(targetBrigadeId)) + 1

    return this.repo.create({
      brigadeId: targetBrigadeId,
      name: area.name,
      prefix: area.prefix,
      color: area.color,
      patientLimit: area.patientLimit,
      order,
    })
  }
}
