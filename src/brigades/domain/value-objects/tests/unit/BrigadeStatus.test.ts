import { assertStatusTransition } from '@/src/brigades/domain/value-objects/BrigadeStatus'

describe('assertStatusTransition', () => {
  it('allows DRAFT → ACTIVE', () => {
    expect(() => assertStatusTransition('DRAFT', 'ACTIVE')).not.toThrow()
  })

  it('allows ACTIVE → CLOSED', () => {
    expect(() => assertStatusTransition('ACTIVE', 'CLOSED')).not.toThrow()
  })

  it('throws for DRAFT → CLOSED', () => {
    expect(() => assertStatusTransition('DRAFT', 'CLOSED')).toThrow('INVALID_TRANSITION')
  })

  it('throws for ACTIVE → DRAFT', () => {
    expect(() => assertStatusTransition('ACTIVE', 'DRAFT')).toThrow('INVALID_TRANSITION')
  })

  it('throws for CLOSED → ACTIVE', () => {
    expect(() => assertStatusTransition('CLOSED', 'ACTIVE')).toThrow('INVALID_TRANSITION')
  })

  it('throws for CLOSED → DRAFT', () => {
    expect(() => assertStatusTransition('CLOSED', 'DRAFT')).toThrow('INVALID_TRANSITION')
  })
})
