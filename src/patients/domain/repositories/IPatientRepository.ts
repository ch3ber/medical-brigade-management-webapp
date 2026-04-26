import type { TurnoInfo, PatientWithTurnos } from '../entities/Patient'

export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface RegisterPatientData {
  brigadeId: string
  fullName: string
  age: number
  gender: string
  phone: string
  address: string
  wantsChurchVisit: boolean
  areaIds: string[]
  registeredBy: string
}

export interface RegisterPatientResult {
  patient: {
    id: string
    fullName: string
    globalOrder: number
  }
  turnos: TurnoInfo[]
}

export interface AreaLimit {
  id: string
  name: string
  prefix: string
  patientLimit: number | null
  currentCount: number
}

export interface ListPatientsFilters {
  areaId?: string
  status?: string
  busqueda?: string
  pagina: number
  limite: number
}

export interface PaginatedPatients {
  patients: PatientWithTurnos[]
  total: number
  pagina: number
  limite: number
}

export interface IPatientRepository {
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  findBrigadeStatus(brigadeId: string, userId: string): Promise<{ status: string } | null>
  findAreaLimits(areaIds: string[], brigadeId: string): Promise<AreaLimit[]>
  registerPatient(data: RegisterPatientData): Promise<RegisterPatientResult>
  findAllByBrigade(
    brigadeId: string,
    userId: string,
    filters: ListPatientsFilters,
  ): Promise<PaginatedPatients>
  findById(patientId: string, brigadeId: string, userId: string): Promise<PatientWithTurnos | null>
  addToArea(brigadeId: string, patientId: string, areaId: string): Promise<TurnoInfo>
}
