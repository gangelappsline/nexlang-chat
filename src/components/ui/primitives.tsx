import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin text-brand-600', className)} aria-hidden="true" />
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-[shimmer_1.8s_ease-in-out_infinite] rounded-lg bg-ink-900/8', className)}
    />
  )
}

type BadgeTone = 'brand' | 'emerald' | 'amber' | 'rose' | 'neutral' | 'violet' | 'aqua'

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  neutral: 'bg-ink-900/5 text-ink-600 ring-ink-900/5',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  aqua: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  dot = false,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        {icon}
      </div>
      <p className="mt-4 text-[15px] font-semibold text-ink-900">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line bg-white px-1 font-sans text-[10px] font-medium text-ink-400">
      {children}
    </kbd>
  )
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">
        {children}
      </h3>
      {action}
    </div>
  )
}
