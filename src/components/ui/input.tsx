import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/cn'

const baseField =
  'w-full rounded-xl bg-white text-[15px] text-ink-900 placeholder:text-ink-400 transition-all ' +
  'ring-1 ring-line-strong hover:ring-ink-300 focus:ring-2 focus:ring-brand-500 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-400'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  trailing?: ReactNode
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, icon, trailing, invalid, ...props },
  ref,
) {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          baseField,
          'h-12',
          icon ? 'pl-11' : 'pl-4',
          trailing ? 'pr-12' : 'pr-4',
          invalid && 'ring-rose-400 focus:ring-rose-500 hover:ring-rose-400',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {trailing ? (
        <span className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</span>
      ) : null}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        baseField,
        'resize-none px-3.5 py-2.5 text-sm leading-relaxed',
        invalid && 'ring-rose-400 focus:ring-rose-500',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
})

interface FieldProps {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function Field({ label, htmlFor, hint, error, children, className, action }: FieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-700">
            {label}
          </label>
          {action}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-[12.5px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}
