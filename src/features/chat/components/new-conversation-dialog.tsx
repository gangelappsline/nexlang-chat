import { Check, Search, UserRound, UsersRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { EmptyState, Skeleton } from '@/components/ui/primitives'
import { getErrorMessage } from '@/lib/api/errors'
import { cn } from '@/lib/cn'

import { useCreateConversation, useDirectory } from '../hooks'

interface NewConversationDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
}

export function NewConversationDialog({ open, onClose, onCreated }: NewConversationDialogProps) {
  const [mode, setMode] = useState<'direct' | 'group'>('direct')
  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')

  const directoryQuery = useDirectory(open)
  const create = useCreateConversation()

  const close = () => {
    setMode('direct')
    setSelected([])
    setName('')
    setQuery('')
    create.reset()
    onClose()
  }

  const people = useMemo(() => {
    const list = directoryQuery.data ?? []
    const needle = query.trim().toLowerCase()
    if (!needle) return list
    return list.filter(
      (person) =>
        person.name.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle),
    )
  }, [directoryQuery.data, query])

  const togglePerson = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const selectedPeople = (directoryQuery.data ?? []).filter((person) =>
    selected.includes(person.id),
  )

  const handleError = (error: unknown) => {
    toast.error('No pudimos crear la conversación', { description: getErrorMessage(error) })
  }

  /** En chat directo basta con seleccionar a la persona: se crea la conversación. */
  const startDirect = (personId: string, personName: string) => {
    if (create.isPending) return

    create.mutate(
      { participantIds: [personId], type: 'direct' },
      {
        onSuccess: (conversation) => {
          if (!conversation) {
            toast.error('La API no devolvió la conversación creada')
            return
          }
          toast.success('Conversación iniciada', { description: personName })
          onCreated(conversation.id)
          close()
        },
        onError: handleError,
      },
    )
  }

  const createGroup = () => {
    if (selected.length === 0 || create.isPending) return

    create.mutate(
      {
        participantIds: selected,
        type: 'group',
        ...(name.trim() ? { name: name.trim() } : {}),
      },
      {
        onSuccess: (conversation) => {
          if (!conversation) {
            toast.error('La API no devolvió la conversación creada')
            return
          }
          toast.success('Grupo creado', { description: conversation.title })
          onCreated(conversation.id)
          close()
        },
        onError: handleError,
      },
    )
  }

  const pendingId =
    create.isPending && create.variables?.type === 'direct'
      ? create.variables.participantIds[0]
      : null

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nueva conversación"
      description="Elige a una persona para chatear o reúne a varias en un grupo."
      icon={<UsersRound className="size-5" />}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancelar
          </Button>
          {mode === 'group' ? (
            <Button
              onClick={createGroup}
              disabled={selected.length === 0}
              loading={create.isPending}
              leftIcon={<UsersRound className="size-4" />}
            >
              Crear grupo ({selected.length})
            </Button>
          ) : (
            <span className="self-center text-[11.5px] text-ink-400">
              Selecciona una persona para iniciar el chat
            </span>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-1 rounded-xl bg-surface p-1 ring-1 ring-inset ring-line">
          {(['direct', 'group'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value)
                setSelected([])
                create.reset()
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors',
                mode === value
                  ? 'bg-white text-ink-900 shadow-sm ring-1 ring-line'
                  : 'text-ink-500 hover:text-ink-800',
              )}
            >
              {value === 'direct' ? (
                <UserRound className="size-3.5" />
              ) : (
                <UsersRound className="size-3.5" />
              )}
              {value === 'direct' ? 'Chat directo' : 'Nuevo grupo'}
            </button>
          ))}
        </div>

        {mode === 'group' ? (
          <div className="space-y-2">
            <label htmlFor="group-name" className="text-[12.5px] font-medium text-ink-700">
              Nombre del grupo <span className="font-normal text-ink-400">(opcional)</span>
            </label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Equipo de Soporte"
              maxLength={60}
            />
          </div>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar persona…"
            aria-label="Buscar persona"
            className="h-10 w-full rounded-xl bg-surface pl-9 pr-3 text-[12.5px] ring-1 ring-inset ring-line transition-all placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {mode === 'group' && selectedPeople.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedPeople.map((person) => (
              <span
                key={person.id}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-0.5 pr-1.5 text-[11px] font-medium text-brand-700 ring-1 ring-inset ring-brand-100"
              >
                <Avatar name={person.name} photoUrl={person.photoUrl} size="xs" className="scale-75" />
                {person.name}
                <button
                  type="button"
                  aria-label={`Quitar a ${person.name}`}
                  onClick={() => togglePerson(person.id)}
                  className="grid size-4 place-items-center rounded-full hover:bg-brand-100"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="thin-scrollbar max-h-[280px] overflow-y-auto rounded-xl ring-1 ring-inset ring-line">
          {directoryQuery.isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-1.5">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : directoryQuery.isError ? (
            <EmptyState
              icon={<UserRound className="size-5" />}
              title="No pudimos cargar los usuarios"
              description="Revisa tu conexión e inténtalo de nuevo."
              action={
                <button
                  type="button"
                  onClick={() => void directoryQuery.refetch()}
                  className="rounded-xl bg-surface px-4 py-2 text-[12.5px] font-semibold text-ink-700 ring-1 ring-line transition-colors hover:bg-white"
                >
                  Reintentar
                </button>
              }
            />
          ) : people.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="Sin resultados"
              description={
                query
                  ? `No encontramos a nadie con “${query}”.`
                  : 'No hay otros usuarios disponibles para conversar.'
              }
            />
          ) : (
            people.map((person) => {
              const active = selected.includes(person.id)
              const loading = pendingId === person.id

              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() =>
                    mode === 'direct'
                      ? startDirect(person.id, person.name)
                      : togglePerson(person.id)
                  }
                  disabled={create.isPending}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors disabled:cursor-progress',
                    active ? 'bg-brand-50/70' : 'hover:bg-surface',
                  )}
                >
                  <Avatar name={person.name} photoUrl={person.photoUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-ink-900">
                      {person.name}
                    </p>
                    <p className="truncate text-[11px] text-ink-400">{person.email}</p>
                  </div>
                  {mode === 'group' ? (
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-md border transition-all',
                        active
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-line-strong bg-white text-transparent',
                      )}
                    >
                      <Check className="size-3" />
                    </span>
                  ) : loading ? (
                    <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
