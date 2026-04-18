export type MockBrigadeStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export interface MockBrigade {
  id: string
  name: string
  location: string
  date: string
  status: MockBrigadeStatus
  patientsCount: number
  areasCount: number
}

export interface MockArea {
  id: string
  brigadeId: string
  name: string
  prefix: string
  color: string
  waitingCount: number
  servedCount: number
  currentLabel?: string
}

export interface MockTurno {
  id: string
  label: string
  patientName: string
  age: number
  status: 'WAITING' | 'CALLED' | 'SERVED' | 'MOVED' | 'REMOVED'
  areaOrder: number
  globalOrder: number
}

export const mockBrigades: MockBrigade[] = [
  {
    id: 'brg-01',
    name: 'San Miguel Health Day',
    location: 'San Miguel Parish',
    date: 'Apr 18, 2026',
    status: 'ACTIVE',
    patientsCount: 84,
    areasCount: 5,
  },
  {
    id: 'brg-02',
    name: 'Santa Rosa Outreach',
    location: 'Santa Rosa School',
    date: 'Apr 25, 2026',
    status: 'DRAFT',
    patientsCount: 0,
    areasCount: 4,
  },
  {
    id: 'brg-03',
    name: 'Villa Nueva Brigade',
    location: 'Villa Nueva Chapel',
    date: 'Mar 14, 2026',
    status: 'CLOSED',
    patientsCount: 132,
    areasCount: 6,
  },
]

export const mockAreas: MockArea[] = [
  {
    id: 'area-01',
    brigadeId: 'brg-01',
    name: 'General Medicine',
    prefix: 'GM',
    color: '#4b6bfb',
    waitingCount: 12,
    servedCount: 28,
    currentLabel: 'GM-29',
  },
  {
    id: 'area-02',
    brigadeId: 'brg-01',
    name: 'Dentistry',
    prefix: 'D',
    color: '#16a34a',
    waitingCount: 8,
    servedCount: 14,
    currentLabel: 'D-15',
  },
  {
    id: 'area-03',
    brigadeId: 'brg-01',
    name: 'Pediatrics',
    prefix: 'P',
    color: '#f59e0b',
    waitingCount: 5,
    servedCount: 9,
  },
  {
    id: 'area-04',
    brigadeId: 'brg-01',
    name: 'Pharmacy',
    prefix: 'FA',
    color: '#8b5cf6',
    waitingCount: 17,
    servedCount: 40,
    currentLabel: 'FA-41',
  },
  {
    id: 'area-05',
    brigadeId: 'brg-01',
    name: 'Church Visit',
    prefix: 'CV',
    color: '#ef4444',
    waitingCount: 3,
    servedCount: 7,
  },
]

export const mockTurnos: MockTurno[] = [
  {
    id: 't-01',
    label: 'GM-29',
    patientName: 'Maria Lopez',
    age: 42,
    status: 'CALLED',
    areaOrder: 29,
    globalOrder: 82,
  },
  {
    id: 't-02',
    label: 'GM-30',
    patientName: 'Juan Perez',
    age: 55,
    status: 'WAITING',
    areaOrder: 30,
    globalOrder: 83,
  },
  {
    id: 't-03',
    label: 'GM-31',
    patientName: 'Ana Ramirez',
    age: 34,
    status: 'WAITING',
    areaOrder: 31,
    globalOrder: 84,
  },
  {
    id: 't-04',
    label: 'GM-32',
    patientName: 'Carlos Diaz',
    age: 67,
    status: 'WAITING',
    areaOrder: 32,
    globalOrder: 85,
  },
  {
    id: 't-05',
    label: 'GM-33',
    patientName: 'Sofia Torres',
    age: 28,
    status: 'WAITING',
    areaOrder: 33,
    globalOrder: 86,
  },
]

export const mockServed: MockTurno[] = [
  {
    id: 's-01',
    label: 'GM-28',
    patientName: 'Pedro Gomez',
    age: 51,
    status: 'SERVED',
    areaOrder: 28,
    globalOrder: 80,
  },
  {
    id: 's-02',
    label: 'GM-27',
    patientName: 'Lucia Herrera',
    age: 39,
    status: 'SERVED',
    areaOrder: 27,
    globalOrder: 79,
  },
  {
    id: 's-03',
    label: 'GM-26',
    patientName: 'Ricardo Vargas',
    age: 60,
    status: 'SERVED',
    areaOrder: 26,
    globalOrder: 78,
  },
]
