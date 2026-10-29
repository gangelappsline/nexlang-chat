import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react'

import { cn } from '@/lib/cn'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
  label?: string
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
  label = 'Código de verificación',
}: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  const focusAt = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))]
    target?.focus()
    target?.select()
  }

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/\D/g, '')

    if (!raw) {
      onChange(digits.slice(0, index).join(''))
      return
    }

    if (raw.length > 1) {
      // Pasted or autofilled block of digits.
      const next = (digits.slice(0, index).join('') + raw).slice(0, length)
      onChange(next)
      focusAt(next.length)
      return
    }

    const next = (digits.slice(0, index).join('') + raw).slice(0, length)
    onChange(next)
    if (index < length - 1) focusAt(index + 1)
  }

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const start = digits[index] ? index : Math.max(0, index - 1)
      onChange(digits.slice(0, start).join(''))
      focusAt(start)
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAt(index - 1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusAt(index + 1)
    }
    if (event.key === 'Delete') {
      event.preventDefault()
      onChange(digits.slice(0, index).join(''))
      focusAt(index)
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    focusAt(pasted.length)
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center justify-between gap-2 sm:gap-2.5"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element
          }}
          value={digit}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste}
          onFocus={(event) => event.currentTarget.select()}
          autoFocus={autoFocus && index === 0}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Dígito ${index + 1}`}
          className={cn(
            'h-14 w-full min-w-0 rounded-xl bg-white text-center text-xl font-semibold tabular-nums text-ink-900',
            'ring-1 ring-line-strong transition-all duration-150',
            'hover:ring-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500',
            'disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-400',
            digit && 'bg-brand-50/50 ring-brand-200',
            invalid && 'ring-rose-300 focus:ring-rose-500',
          )}
        />
      ))}
    </div>
  )
}
