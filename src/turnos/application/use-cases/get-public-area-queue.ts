import type { ITurnoRepository, PublicAreaQueue } from '../../domain/repositories/ITurnoRepository'

interface GetPublicAreaQueueDto {
  brigadeId: string
  areaId: string
  token: string
}

export class GetPublicAreaQueueUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, token }: GetPublicAreaQueueDto): Promise<PublicAreaQueue> {
    const queue = await this.repo.getPublicAreaQueue(brigadeId, areaId, token)
    if (!queue) throw new Error('AREA_NO_ENCONTRADA')
    return queue
  }
}
