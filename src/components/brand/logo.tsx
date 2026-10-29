import { cn } from '@/lib/cn'

type Tone = 'color' | 'white' | 'dark'

interface LogoMarkProps {
  className?: string
  tone?: Exclude<Tone, 'dark'>
}

export function LogoMark({ className, tone = 'color' }: LogoMarkProps) {
  return (
    <img
      src={tone === 'white' ? '/brand/nexlang-mark-white.png' : '/brand/nexlang-mark.png'}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('h-9 w-auto select-none', className)}
    />
  )
}

interface LogoFullProps {
  className?: string
  tone?: Tone
}

export function LogoFull({ className, tone = 'dark' }: LogoFullProps) {
  return (
    <img
      src={tone === 'white' ? '/brand/nexlang-logo-white.png' : '/brand/nexlang-logo-dark.png'}
      alt="Nexlang"
      draggable={false}
      className={cn('h-8 w-auto select-none', className)}
    />
  )
}
