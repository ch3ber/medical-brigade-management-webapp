'use client'

import { useState } from 'react'
import { User, Phone, CalendarDays, Stethoscope, MapPin, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/cn'

export interface PatientFormAreaOption {
  id: string
  name: string
  prefix: string
  color: string
}

interface PatientFormProps {
  areas: PatientFormAreaOption[]
  action: (formData: FormData) => Promise<void>
}

export function PatientForm({ areas, action }: PatientFormProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [wantsChurch, setWantsChurch] = useState<boolean | null>(null)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])

  const step1Valid = name.trim() && age && gender && phone.trim()
  const step2Valid = address.trim() && wantsChurch !== null && selectedAreas.length > 0

  const toggleArea = (id: string) =>
    setSelectedAreas((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const handleSubmit = async () => {
    const formData = new FormData()
    formData.set('fullName', name)
    formData.set('age', age)
    formData.set('gender', gender)
    formData.set('phone', phone)
    formData.set('address', address)
    formData.set('wantsChurchVisit', String(wantsChurch))
    for (const id of selectedAreas) formData.append('areaIds', id)
    await action(formData)
  }

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div className="flex gap-2">
        <div className="h-1 flex-1 rounded-full bg-[var(--accent)]" />
        <div
          className={cn(
            'h-1 flex-1 rounded-full transition-colors',
            step === 2 ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
          )}
        />
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <Field
            icon={<User className="h-4 w-4" />}
            label="Nombre completo"
          >
            <Input
              placeholder="María López"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field
            icon={<CalendarDays className="h-4 w-4" />}
            label="Edad"
          >
            <Input
              type="number"
              placeholder="42"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={0}
              max={130}
              required
            />
          </Field>

          <Field
            icon={<User className="h-4 w-4" />}
            label="Género"
          >
            <div className="flex gap-2">
              {(['F', 'M', 'Otro'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGender(v)}
                  className={cn(
                    'flex-1 rounded-full py-3 text-sm font-semibold transition',
                    gender === v
                      ? 'bg-[var(--accent)] text-white'
                      : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
                  )}
                >
                  {v === 'F' ? 'Femenino' : v === 'M' ? 'Masculino' : 'Otro'}
                </button>
              ))}
            </div>
          </Field>

          <Field
            icon={<Phone className="h-4 w-4" />}
            label="Teléfono"
          >
            <Input
              type="tel"
              placeholder="+503 0000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Button
            size="lg"
            className="w-full"
            disabled={!step1Valid}
            onClick={() => setStep(2)}
            type="button"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Dirección"
          >
            <Input
              placeholder="Col. Las Flores #12"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </Field>

          <Field
            icon={<User className="h-4 w-4" />}
            label="¿Desea visita pastoral?"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWantsChurch(true)}
                className={cn(
                  'flex-1 rounded-full py-3 text-sm font-semibold transition',
                  wantsChurch === true
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
                )}
              >
                Sí, deseo visita
              </button>
              <button
                type="button"
                onClick={() => setWantsChurch(false)}
                className={cn(
                  'flex-1 rounded-full py-3 text-sm font-semibold transition',
                  wantsChurch === false
                    ? 'bg-[var(--accent)] text-white'
                    : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
                )}
              >
                No, gracias
              </button>
            </div>
          </Field>

          <Field
            icon={<Stethoscope className="h-4 w-4" />}
            label="Asignar a áreas"
          >
            <div className="rounded-2xl bg-[var(--surface)] p-3">
              <div className="flex flex-wrap gap-2">
                {areas.map((a) => {
                  const active = selectedAreas.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleArea(a.id)}
                      className="inline-flex items-center gap-2 rounded-full border-2 px-3 py-2 text-xs font-semibold transition"
                      style={{
                        borderColor: active ? a.color : 'var(--border)',
                        background: active ? a.color + '20' : 'white',
                        color: 'var(--foreground)',
                      }}
                    >
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: a.color }}
                      >
                        {a.prefix}
                      </span>
                      {a.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <p className="mt-2 ml-1 text-xs text-[var(--muted)]">
              {selectedAreas.length} área{selectedAreas.length === 1 ? '' : 's'} seleccionada
              {selectedAreas.length === 1 ? '' : 's'}
            </p>
          </Field>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold"
            >
              Atrás
            </button>
            <Button
              size="lg"
              className="flex-1"
              disabled={!step2Valid}
              onClick={handleSubmit}
              type="button"
            >
              Registrar y generar turnos
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <span className="mb-1 ml-1 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  )
}
