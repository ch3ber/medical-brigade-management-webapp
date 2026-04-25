import type { ITurnoRepository, AuthenticatedAreaQueue } from '../../domain/repositories/ITurnoRepository'

interface GetAuthenticatedAreaQueueDto {
  brigadeId: string
  areaId: string
  userId: string
}

export class GetAuthenticatedAreaQueueUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({
    brigadeId,
    areaId,
    userId,
  }: GetAuthenticatedAreaQueueDto): Promise<AuthenticatedAreaQueue> {
    const queue = await this.repo.getAuthenticatedAreaQueue(brigadeId, areaId, userId)
    if (!queue) throw new Error('AREA_NO_ENCONTRADA')
    return queue
  }
}
