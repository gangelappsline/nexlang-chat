import { motion } from 'framer-motion'
import { MessagesSquare, SendHorizontal, ShieldCheck, UsersRound, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

import { LogoFull, LogoMark } from '@/components/brand/logo'
import { Avatar } from '@/components/ui/avatar'

const highlights = [
  {
    icon: MessagesSquare,
    title: 'Chats y grupos ilimitados',
    description: 'Conversaciones directas, canales de equipo y atención al cliente.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceso sin contraseñas',
    description: 'Códigos de un solo uso enviados a tu correo corporativo.',
  },
  {
    icon: Zap,
    title: 'Todo en tiempo real',
    description: 'Mensajes, presencia y notificaciones sincronizadas al instante.',
  },
]

function Bubble({ side, children }: { side: 'in' | 'out'; children: ReactNode }) {
  return (
    <div className={side === 'out' ? 'flex justify-end' : 'flex justify-start'}>
      <p
        className={
          side === 'out'
            ? 'max-w-[82%] rounded-2xl rounded-br-md bg-brand-500/90 px-3.5 py-2 text-[11.5px] leading-relaxed text-white shadow-lg shadow-brand-900/20'
            : 'max-w-[82%] rounded-2xl rounded-bl-md bg-white/12 px-3.5 py-2 text-[11.5px] leading-relaxed text-white/85 ring-1 ring-white/10'
        }
      >
        {children}
      </p>
    </div>
  )
}

function ChatPreview() {
  return (
    <div className="relative mt-10 w-full max-w-[390px]">
      <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-brand-400/25 via-transparent to-aqua-400/20 blur-2xl" />
      <div className="relative rounded-3xl border border-white/12 bg-white/[0.07] p-4 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <Avatar name="Dianne Russell" size="sm" presence="online" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-white">Dianne Russell</p>
            <p className="flex items-center gap-1.5 text-[10.5px] text-emerald-300/90">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              en línea · vía Web
            </p>
          </div>
          <span className="grid size-7 place-items-center rounded-lg bg-white/10 text-white/60">
            <MessagesSquare className="size-3.5" />
          </span>
        </div>

        <div className="space-y-2.5 py-3.5">
          <Bubble side="in">Hola, necesito ayuda con mi solicitud de préstamo.</Bubble>
          <Bubble side="out">¡Claro que sí! ¿Me compartes tu número de referencia?</Bubble>
          <Bubble side="in">Es el #543434, muchas gracias 🙌</Bubble>
          <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-white/12 px-3 py-2.5 ring-1 ring-white/10">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="size-1.5 rounded-full bg-white/70"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -1.5, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.15 }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10">
          <span className="flex-1 text-[11.5px] text-white/35">Escribe un mensaje…</span>
          <span className="grid size-6 place-items-center rounded-md bg-brand-500 text-white">
            <SendHorizontal className="size-3" />
          </span>
        </div>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#080c24] lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-32 size-[560px] animate-aurora rounded-full bg-brand-600/45 blur-[130px]" />
        <div className="absolute -bottom-48 -right-24 size-[480px] animate-float-slow rounded-full bg-aqua-500/25 blur-[140px]" />
        <div className="absolute inset-0 grid-pattern opacity-50 [mask-image:radial-gradient(80%_70%_at_50%_35%,black,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#05081a] to-transparent" />
      </div>

      <div className="relative flex flex-1 flex-col justify-between gap-10 p-10 xl:p-14">
        <div className="flex items-center justify-between gap-4">
          <LogoFull tone="white" className="h-7" />
          <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/65">
            Espacio de trabajo · Nexlang HQ
          </span>
        </div>

        <div className="max-w-[540px]">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1] }}
            className="text-balance text-[42px] font-semibold leading-[1.03] tracking-[-0.035em] text-white xl:text-[50px]"
          >
            Toda tu conversación,{' '}
            <span className="bg-gradient-to-r from-aqua-300 via-white to-brand-300 bg-clip-text text-transparent">
              en un solo lugar.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mt-5 max-w-[440px] text-[14.5px] leading-relaxed text-white/55"
          >
            Mensajería para equipos que atienden rápido: chats directos, grupos de trabajo y
            seguimiento de clientes con la identidad de Nexlang.
          </motion.p>

          <ul className="mt-8 space-y-3.5">
            {highlights.map((highlight, index) => (
              <motion.li
                key={highlight.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.15 + index * 0.08 }}
                className="flex items-start gap-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-aqua-300 ring-1 ring-white/10">
                  <highlight.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-white/90">{highlight.title}</p>
                  <p className="text-[12px] leading-relaxed text-white/45">
                    {highlight.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>

          <ChatPreview />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {['Dianne Russell', 'Albert Flores', 'Kate Morrison', 'Courtney Henry'].map((name) => (
              <Avatar key={name} name={name} size="xs" ring />
            ))}
          </div>
          <p className="text-[12px] leading-snug text-white/45">
            Más de <span className="font-semibold text-white/80">2,400 equipos</span> conversan
            cada día en Nexlang.
          </p>
        </div>
      </div>
    </aside>
  )
}

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <main className="relative flex min-h-dvh flex-col bg-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(83,111,252,0.09),transparent)]" />

        <header className="relative flex items-center justify-between px-5 py-5 sm:px-10 lg:justify-end lg:px-12">
          <div className="flex items-center gap-2.5 lg:hidden">
            <LogoMark className="h-7" />
            <span className="text-[15px] font-semibold tracking-tight text-ink-900">Nexlang</span>
          </div>
          <p className="hidden items-center gap-2 text-[12.5px] text-ink-400 sm:flex">
            <ShieldCheck className="size-4 text-emerald-500" />
            Conexión cifrada de extremo a extremo
          </p>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-5 py-6 sm:px-10 lg:px-12">
          <div className="w-full max-w-[436px]">{children}</div>
        </div>

        <footer className="relative flex flex-col items-center gap-2 px-6 pb-6 pt-4 text-center text-[11.5px] text-ink-400 sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Nexlang. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <button type="button" className="transition-colors hover:text-ink-700">
              Privacidad
            </button>
            <button type="button" className="transition-colors hover:text-ink-700">
              Términos
            </button>
            <button type="button" className="transition-colors hover:text-ink-700">
              Soporte
            </button>
          </div>
        </footer>
      </main>
    </div>
  )
}

export function BrandFootnote() {
  return (
    <p className="mt-6 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-400">
      <UsersRound className="size-3.5" />
      Acceso exclusivo para miembros del espacio de trabajo
    </p>
  )
}
