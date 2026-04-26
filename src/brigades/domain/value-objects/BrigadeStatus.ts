import type { BrigadeStatus } from '../entities/Brigade'

const VALID_TRANSITIONS: Record<BrigadeStatus, BrigadeStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
}

export function assertStatusTransition(from: BrigadeStatus, to: BrigadeStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new Error(`INVALID_TRANSITION: ${from} -> ${to}`)
  }
}
