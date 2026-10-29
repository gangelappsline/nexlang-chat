import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (props: { close: () => void }) => ReactNode
  align?: 'left' | 'right'
  className?: string
  panelClassName?: string
}

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
  panelClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.2, 0.8, 0.4, 1] }}
            className={cn(
              'absolute z-40 mt-2 min-w-[212px] overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_24px_60px_-24px_rgba(15,20,36,0.35)]',
              align === 'right' ? 'right-0' : 'left-0',
              panelClassName,
            )}
            role="menu"
          >
            {children({ close: () => setOpen(false) })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

interface MenuItemProps {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  shortcut?: string
}

export function MenuItem({
  children,
  icon,
  onClick,
  danger = false,
  disabled = false,
  shortcut,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        danger
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-ink-700 hover:bg-surface hover:text-ink-900',
      )}
    >
      {icon ? <span className="grid size-4 place-items-center text-ink-400">{icon}</span> : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? <kbd className="text-[10px] font-normal text-ink-400">{shortcut}</kbd> : null}
    </button>
  )
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-line" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-400">
      {children}
    </div>
  )
}
