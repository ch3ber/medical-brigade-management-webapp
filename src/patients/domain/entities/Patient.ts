export interface PatientProps {
  id: string
  brigadeId: string
  fullName: string
  age: number
  gender: string
  phone: string
  address: string
  wantsChurchVisit: boolean
  globalOrder: number
  registeredBy: string
  createdAt: Date
}

export interface TurnoInfo {
  id: string
  areaId: string
  areaName: string
  areaPrefix: string
  areaOrder: number
  status: string
  movedCount: number
}

export interface PatientWithTurnos extends PatientProps {
  turnos: TurnoInfo[]
}

export class Patient {
  readonly id: string
  readonly brigadeId: string
  readonly fullName: string
  readonly age: number
  readonly gender: string
  readonly phone: string
  readonly address: string
  readonly wantsChurchVisit: boolean
  readonly globalOrder: number
  readonly registeredBy: string
  readonly createdAt: Date

  constructor(props: PatientProps) {
    this.id = props.id
    this.brigadeId = props.brigadeId
    this.fullName = props.fullName
    this.age = props.age
    this.gender = props.gender
    this.phone = props.phone
    this.address = props.address
    this.wantsChurchVisit = props.wantsChurchVisit
    this.globalOrder = props.globalOrder
    this.registeredBy = props.registeredBy
    this.createdAt = props.createdAt
  }
}
