export type TurnoStatusValue = 'WAITING' | 'CALLED' | 'SERVED' | 'MOVED' | 'REMOVED'

export interface TurnoProps {
  id: string
  brigadeId: string
  areaId: string
  patientId: string
  areaOrder: number
  status: TurnoStatusValue
  calledAt: Date | null
  servedAt: Date | null
  movedCount: number
  createdAt: Date
}

export class Turno {
  readonly id: string
  readonly brigadeId: string
  readonly areaId: string
  readonly patientId: string
  readonly areaOrder: number
  readonly status: TurnoStatusValue
  readonly calledAt: Date | null
  readonly servedAt: Date | null
  readonly movedCount: number
  readonly createdAt: Date

  constructor(props: TurnoProps) {
    this.id = props.id
    this.brigadeId = props.brigadeId
    this.areaId = props.areaId
    this.patientId = props.patientId
    this.areaOrder = props.areaOrder
    this.status = props.status
    this.calledAt = props.calledAt
    this.servedAt = props.servedAt
    this.movedCount = props.movedCount
    this.createdAt = props.createdAt
  }
}
