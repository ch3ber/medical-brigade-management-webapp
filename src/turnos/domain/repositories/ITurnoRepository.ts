export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface ServedTurnoInfo {
  id: string
  label: string
  atendidoEn: Date
}

export interface CalledTurnoInfo {
  id: string
  label: string
  patient: { nombre: string; edad: number }
  llamadoEn: Date
}

export interface NextTurnoResult {
  atendido: ServedTurnoInfo | null
  llamado: CalledTurnoInfo | null
  enEspera: number
}

export interface MovedTurnoInfo {
  id: string
  label: string
  vecesMovido: number
  nuevoOrden: number
}

export interface MoveResult {
  movido: MovedTurnoInfo
  llamado: CalledTurnoInfo | null
}

export interface RemoveResult {
  eliminado: { id: string; label: string }
  llamado: CalledTurnoInfo | null
}

export interface PublicAreaQueue {
  area: { nombre: string; prefijo: string; color: string }
  turnoActual: { label: string } | null
  enEspera: { label: string }[]
}

export interface ITurnoRepository {
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  findBrigadeStatus(brigadeId: string, userId: string): Promise<{ status: string } | null>
  findWaitingTurno(turnoId: string, areaId: string): Promise<{ id: string } | null>
  findCalledTurno(turnoId: string, areaId: string): Promise<{ id: string } | null>
  callNext(brigadeId: string, areaId: string): Promise<NextTurnoResult>
  callSpecific(brigadeId: string, areaId: string, turnoId: string): Promise<NextTurnoResult>
  moveToTail(brigadeId: string, areaId: string, turnoId: string): Promise<MoveResult>
  remove(brigadeId: string, areaId: string, turnoId: string): Promise<RemoveResult>
  getPublicAreaQueue(brigadeId: string, areaId: string, token: string): Promise<PublicAreaQueue | null>
}
