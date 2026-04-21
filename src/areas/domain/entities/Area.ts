export interface AreaProps {
  id: string
  brigadeId: string
  name: string
  prefix: string
  color: string
  patientLimit: number | null
  order: number
  isActive: boolean
  publicDashboardToken: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AreaWithCountsProps extends AreaProps {
  totalEnEspera: number
  totalAtendidos: number
}

export class Area {
  readonly id: string
  readonly brigadeId: string
  readonly name: string
  readonly prefix: string
  readonly color: string
  readonly patientLimit: number | null
  readonly order: number
  readonly isActive: boolean
  readonly publicDashboardToken: string | null
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: AreaProps) {
    this.id = props.id
    this.brigadeId = props.brigadeId
    this.name = props.name
    this.prefix = props.prefix
    this.color = props.color
    this.patientLimit = props.patientLimit
    this.order = props.order
    this.isActive = props.isActive
    this.publicDashboardToken = props.publicDashboardToken
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }
}

export class AreaWithCounts extends Area {
  readonly totalEnEspera: number
  readonly totalAtendidos: number

  constructor(props: AreaWithCountsProps) {
    super(props)
    this.totalEnEspera = props.totalEnEspera
    this.totalAtendidos = props.totalAtendidos
  }
}
