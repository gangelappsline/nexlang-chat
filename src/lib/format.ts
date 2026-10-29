import { differenceInCalendarDays, format, isSameDay, isThisYear } from 'date-fns'
import { es } from 'date-fns/locale'

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export function formatListTime(iso: string, now = new Date()) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const diff = differenceInCalendarDays(now, date)
  if (diff === 0) return format(date, 'HH:mm')
  if (diff === 1) return 'Ayer'
  if (diff < 7) return capitalize(format(date, 'EEE', { locale: es }))
  if (isThisYear(date)) return format(date, 'd MMM', { locale: es })
  return format(date, 'dd/MM/yy')
}

export function formatMessageTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'HH:mm')
}

export function formatDayLabel(iso: string, now = new Date()) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  if (isSameDay(date, now)) return 'Hoy'
  if (differenceInCalendarDays(now, date) === 1) return 'Ayer'
  return capitalize(format(date, "EEEE d 'de' MMMM", { locale: es }))
}

export function formatSessionLabel(index: number, iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `Sesión ${String(index).padStart(2, '0')} · ${format(date, 'd MMM yyyy', { locale: es })}`
}

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${minutes}m ${String(rest).padStart(2, '0')}s`
  return `${rest}s`
}

export function initials(name: string) {
  const parts = name
    .replace(/[^\p{L}\p{N}\s.-]/gu, '')
    .split(/[\s.-]+/)
    .filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/i

export function isEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim())
}

/** Accepts `someone@company.com` or a Nexlang username such as `devon.lane`. */
export function normalizeIdentifier(raw: string) {
  const value = raw.trim().toLowerCase()
  if (isEmail(value)) {
    return { kind: 'email' as const, value, email: value, username: value.split('@')[0] }
  }
  return { kind: 'username' as const, value, email: `${value}@nexlang.io`, username: value }
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

const ACCENTS = [
  'from-brand-500 to-aqua-400',
  'from-violet-500 to-fuchsia-400',
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',
  'from-sky-500 to-indigo-400',
  'from-cyan-500 to-blue-500',
  'from-lime-500 to-emerald-400',
]

export function accentFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return ACCENTS[hash % ACCENTS.length]
}

export function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
}
