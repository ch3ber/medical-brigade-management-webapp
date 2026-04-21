import type {
  IPatientRepository,
  ListPatientsFilters,
  PaginatedPatients,
} from '../../domain/repositories/IPatientRepository'

interface ListPatientsDto {
  brigadeId: string
  userId: string
  filters: ListPatientsFilters
}

export class ListPatientsUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({ brigadeId, userId, filters }: ListPatientsDto): Promise<PaginatedPatients> {
    return this.repo.findAllByBrigade(brigadeId, userId, filters)
  }
}
