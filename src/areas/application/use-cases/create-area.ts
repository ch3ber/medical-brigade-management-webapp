import type { Area } from '../../domain/entities/Area'
import type { IAreaRepository } from '../../domain/repositories/IAreaRepository'

interface CreateAreaDto {
  brigadeId: string
  userId: string
  name: string
  prefix: string
  color: string
  patientLimit?: number | null
  order?: number
}

export class CreateAreaUseCase {
  constructor(private readonly repo: IAreaRepository) {}

  async execute({
    brigadeId,
    userId,
    name,
    prefix,
    color,
    patientLimit = null,
    order,
  }: CreateAreaDto): Promise<Area> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const finalOrder = order !== undefined ? order : (await this.repo.getMaxOrder(brigadeId)) + 1

    return this.repo.create({ brigadeId, name, prefix, color, patientLimit, order: finalOrder })
  }
}
