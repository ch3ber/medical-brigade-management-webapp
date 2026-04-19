export type BrigadeStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export interface BrigadeProps {
  id: string
  name: string
  description: string | null
  location: string
  date: Date
  status: BrigadeStatus
  openedAt: Date | null
  closedAt: Date | null
  createdBy: string
  createdAt: Date
}

export class Brigade {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly location: string
  readonly date: Date
  readonly status: BrigadeStatus
  readonly openedAt: Date | null
  readonly closedAt: Date | null
  readonly createdBy: string
  readonly createdAt: Date

  constructor(props: BrigadeProps) {
    this.id = props.id
    this.name = props.name
    this.description = props.description
    this.location = props.location
    this.date = props.date
    this.status = props.status
    this.openedAt = props.openedAt
    this.closedAt = props.closedAt
    this.createdBy = props.createdBy
    this.createdAt = props.createdAt
  }

  canOpen(): boolean {
    return this.status === 'DRAFT'
  }

  canClose(): boolean {
    return this.status === 'ACTIVE'
  }

  isEditable(): boolean {
    return this.status !== 'CLOSED'
  }
}
