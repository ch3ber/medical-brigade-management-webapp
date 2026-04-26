'use client'

import { useState, useTransition } from 'react'
import { Send, Key, Mail, Copy, Check, Trash2, X, Link2, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/cn'
import {
  inviteMemberAction,
  generateCredentialsAction,
  removeMemberAction,
} from '@/app/(dashboard)/dashboard/brigades/[brigadeId]/staff/actions'

export interface StaffMemberDisplay {
  id: string
  displayName: string
  email: string
  role: 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'
  isPending: boolean
  hasCredentials: boolean
  isCurrentUser: boolean
}

interface GeneratedCredentials {
  displayName: string
  username: string
  password: string
}

interface StaffManagerProps {
  brigadeId: string
  members: StaffMemberDisplay[]
  isClosed: boolean
}

type Modal = 'invite' | 'credentials' | null

export function StaffManager({ brigadeId, members: initialMembers, isClosed }: StaffManagerProps) {
  const [members, setMembers] = useState(initialMembers)
  const [modal, setModal] = useState<Modal>(null)
  const [generated, setGenerated] = useState<GeneratedCredentials | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleRemove = (id: string) => {
    startTransition(async () => {
      await removeMemberAction(brigadeId, id)
      setMembers((m) => m.filter((x) => x.id !== id))
    })
  }

  return (
    <div className="space-y-4">
      {/* Action tiles */}
      {!isClosed && (
        <div className="grid grid-cols-2 gap-3">
          <ActionTile
            icon={
              <Send
                className="h-5 w-5"
                style={{ color: '#5b6cf5' }}
              />
            }
            title="Invitar usuario"
            subtitle="Por correo"
            bg="#e7eaff"
            onClick={() => {
              setModal('invite')
              setInviteLink(null)
            }}
          />
          <ActionTile
            icon={
              <Key
                className="h-5 w-5"
                style={{ color: '#22b07d' }}
              />
            }
            title="Generar credenciales"
            subtitle="Sin cuenta"
            bg="#daf3e8"
            onClick={() => {
              setModal('credentials')
              setGenerated(null)
            }}
          />
        </div>
      )}

      {/* Members list */}
      <p className="px-1 text-xs font-semibold text-[var(--muted)]">{members.length} miembros</p>
      <div className="space-y-2">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            isClosed={isClosed}
            onRemove={() => handleRemove(m.id)}
          />
        ))}
      </div>

      {/* Generated credentials card */}
      {generated && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-green-700 uppercase">
            Credenciales generadas
          </p>
          <p className="font-semibold text-[var(--foreground)]">{generated.displayName}</p>
          <div className="mt-3 space-y-2">
            <CredRow
              label="Usuario"
              value={generated.username}
            />
            <CredRow
              label="Contraseña"
              value={generated.password}
            />
          </div>
          <p className="mt-3 text-[11px] text-[var(--muted)]">
            Comparte estas credenciales con la persona. No se mostrarán de nuevo.
          </p>
          <button
            onClick={() => setGenerated(null)}
            className="mt-3 w-full rounded-full bg-white/60 py-2.5 text-sm font-semibold text-green-700"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Invite link card */}
      {inviteLink && (
        <div className="mt-4 rounded-2xl border border-[#e7eaff] bg-[#f3f4fa] p-4">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-[#5b6cf5] uppercase">
            Invitación enviada
          </p>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Comparte este enlace con la persona para que acepte la invitación.
          </p>
          <CredRow
            label="Enlace"
            value={typeof window !== 'undefined' ? window.location.origin + inviteLink : inviteLink}
          />
          <button
            onClick={() => setInviteLink(null)}
            className="mt-3 w-full rounded-full bg-white/60 py-2.5 text-sm font-semibold text-[#5b6cf5]"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Modals */}
      {modal === 'invite' && (
        <ModalOverlay onClose={() => setModal(null)}>
          <InviteForm
            brigadeId={brigadeId}
            onCancel={() => setModal(null)}
            onSuccess={(link) => {
              setInviteLink(link)
              setModal(null)
            }}
          />
        </ModalOverlay>
      )}
      {modal === 'credentials' && (
        <ModalOverlay onClose={() => setModal(null)}>
          <CredentialsForm
            brigadeId={brigadeId}
            onCancel={() => setModal(null)}
            onSuccess={(creds, member) => {
              setGenerated(creds)
              setMembers((m) => [...m, member])
              setModal(null)
            }}
          />
        </ModalOverlay>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ActionTile({
  icon,
  title,
  subtitle,
  bg,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  bg: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:bg-white"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: bg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-[var(--muted)]">{subtitle}</p>
      </div>
    </button>
  )
}

function MemberRow({
  member,
  isClosed,
  onRemove,
}: {
  member: StaffMemberDisplay
  isClosed: boolean
  onRemove: () => void
}) {
  const canRemove = !isClosed && !member.isCurrentUser && member.role !== 'DIRECTOR'
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3">
      <Avatar
        initials={member.displayName[0]}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{member.displayName}</span>
          {member.role === 'DIRECTOR' && (
            <span className="shrink-0 rounded-full bg-[#e7eaff] px-2 py-0.5 text-[10px] font-bold text-[#5b6cf5] uppercase">
              Director
            </span>
          )}
          {member.role === 'CO_DIRECTOR' && (
            <span className="shrink-0 rounded-full bg-[#e7eaff] px-2 py-0.5 text-[10px] font-bold text-[#5b6cf5] uppercase">
              Co-director
            </span>
          )}
          {member.isPending && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
              Pendiente
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[var(--muted)]">
          {member.hasCredentials ? (
            <Key className="h-3 w-3 shrink-0" />
          ) : (
            <Mail className="h-3 w-3 shrink-0" />
          )}
          {member.email}
        </p>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100"
          aria-label="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function CredRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2">
      <span className="w-20 shrink-0 text-[11px] text-[var(--muted)]">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">{value}</span>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-[#5b6cf5]"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function InviteForm({
  brigadeId,
  onCancel,
  onSuccess,
}: {
  brigadeId: string
  onCancel: () => void
  onSuccess: (link: string) => void
}) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const submit = () => {
    if (!email) return
    setPending(true)
    setError('')
    startTransition(async () => {
      try {
        const link = await inviteMemberAction(brigadeId, email)
        onSuccess(link)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al enviar la invitación')
      } finally {
        setPending(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold">Invitar usuario registrado</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Se generará un enlace de invitación para enviar a la persona.
        </p>
      </div>
      <FormField
        label="Correo electrónico"
        icon={<Mail className="h-4 w-4" />}
      >
        <Input
          type="email"
          placeholder="maria@brigada.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
        />
      </FormField>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          type="button"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          size="md"
          className="flex-1"
          type="button"
          disabled={!email || pending}
          onClick={submit}
        >
          <Link2 className="h-4 w-4" />
          {pending ? 'Enviando…' : 'Generar enlace'}
        </Button>
      </div>
    </div>
  )
}

function CredentialsForm({
  brigadeId,
  onCancel,
  onSuccess,
}: {
  brigadeId: string
  onCancel: () => void
  onSuccess: (creds: GeneratedCredentials, member: StaffMemberDisplay) => void
}) {
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  const submit = () => {
    if (!name.trim()) return
    setPending(true)
    setError('')

    const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0]
    const suffix = Math.floor(Math.random() * 90) + 10
    const username = `${base}.${suffix}`
    const password = 'Bg' + Math.random().toString(36).slice(2, 8)

    startTransition(async () => {
      try {
        await generateCredentialsAction(brigadeId, username, password)
        const member: StaffMemberDisplay = {
          id: crypto.randomUUID(),
          displayName: name,
          email: `${username}@staff.local`,
          role: 'STAFF',
          isPending: false,
          hasCredentials: true,
          isCurrentUser: false,
        }
        onSuccess({ displayName: name, username, password }, member)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al generar credenciales')
      } finally {
        setPending(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold">Generar credenciales</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Para personas sin cuenta. El sistema generará usuario y contraseña.
        </p>
      </div>
      <FormField
        label="Nombre completo"
        icon={<ShieldCheck className="h-4 w-4" />}
      >
        <Input
          placeholder="Pedro Salazar"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={pending}
        />
      </FormField>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          type="button"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          size="md"
          className="flex-1"
          type="button"
          disabled={!name.trim() || pending}
          onClick={submit}
        >
          <Key className="h-4 w-4" />
          {pending ? 'Generando…' : 'Generar'}
        </Button>
      </div>
    </div>
  )
}

function FormField({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <span className="mb-1 ml-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  )
}
