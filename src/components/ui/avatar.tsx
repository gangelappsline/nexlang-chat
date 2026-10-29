import type { Presence } from '@/types'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { accentFor, initials } from '@/lib/format'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizeStyles: Record<Size, string> = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-[11px]',
  md: 'size-11 text-xs',
  lg: 'size-14 text-sm',
  xl: 'size-[72px] text-lg',
}

const dotStyles: Record<Size, string> = {
  xs: 'size-2 border',
  sm: 'size-2.5 border-2',
  md: 'size-3 border-2',
  lg: 'size-3.5 border-2',
  xl: 'size-4 border-2',
}

const presenceColor: Record<Presence, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-400',
  offline: 'bg-ink-300',
}

interface AvatarProps {
  name: string
  accent?: string
  size?: Size
  presence?: Presence
  badge?: ReactNode
  className?: string
  rounded?: 'full' | 'xl'
  ring?: boolean
}

export function Avatar({
  name,
  accent,
  size = 'md',
  presence,
  badge,
  className,
  rounded = 'full',
  ring = false,
}: AvatarProps) {
  const gradient = accent ?? accentFor(name)

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center bg-gradient-to-br font-semibold tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]',
          gradient,
          sizeStyles[size],
          rounded === 'full' ? 'rounded-full' : 'rounded-2xl',
          ring && 'ring-2 ring-white',
        )}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      {presence ? (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white',
            dotStyles[size],
            presenceColor[presence],
          )}
          title={presence === 'online' ? 'En línea' : presence === 'away' ? 'Ausente' : 'Desconectado'}
        />
      ) : null}
      {badge ? (
        <span className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full bg-white text-ink-600 shadow-sm ring-1 ring-line">
          {badge}
        </span>
      ) : null}
    </span>
  )
}

interface AvatarStackProps {
  people: { name: string; accent?: string }[]
  size?: Size
  max?: number
}

export function AvatarStack({ people, size = 'sm', max = 3 }: AvatarStackProps) {
  const visible = people.slice(0, max)
  const rest = people.length - visible.length

  return (
    <div className="flex items-center">
      {visible.map((person, index) => (
        <span key={`${person.name}-${index}`} className={index > 0 ? '-ml-2' : undefined}>
          <Avatar name={person.name} accent={person.accent} size={size} ring />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            '-ml-2 grid place-items-center rounded-full bg-ink-900 text-[10px] font-semibold text-white ring-2 ring-white',
            sizeStyles[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  )
}
