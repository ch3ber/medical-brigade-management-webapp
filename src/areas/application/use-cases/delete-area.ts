import type { IAreaRepository } from '../../domain/repositories/IAreaRepository'

interface DeleteAreaDto {
  brigadeId: string
  areaId: string
  userId: string
}

export class DeleteAreaUseCase {
  constructor(private readonly repo: IAreaRepository) {}

  async execute({ brigadeId, areaId, userId }: DeleteAreaDto): Promise<void> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR') throw new Error('SIN_PERMISO')

    const area = await this.repo.findById(areaId, brigadeId)
    if (!area) throw new Error('AREA_NO_ENCONTRADA')

    const hasActive = await this.repo.hasActiveTurnos(areaId)
    if (hasActive) throw new Error('AREA_CON_TURNOS_ACTIVOS')

    await this.repo.softDelete(areaId)
  }
}
