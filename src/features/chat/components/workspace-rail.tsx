import {
  BellDot,
  Bot,
  ContactRound,
  GalleryVerticalEnd,
  Gift,
  Inbox,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  Settings,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { LogoMark } from '@/components/brand/logo'
import { cn } from '@/lib/cn'
import { countUnread } from '@/features/chat/utils'
import type { Conversation } from '@/types'

import { UserMenu } from './user-menu'

interface RailButtonProps {
  label: string
  icon: ReactNode
  active?: boolean
  badge?: number
  onClick?: () => void
}

function RailButton({ label, icon, active = false, badge, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative grid size-11 place-items-center rounded-2xl transition-all duration-200',
        active
          ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/25'
          : 'text-white/60 hover:bg-white/10 hover:text-white',
      )}
    >
      {icon}
      {active ? (
        <span className="absolute -left-2.5 h-5 w-1 rounded-r-full bg-white" aria-hidden="true" />
      ) : null}
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold leading-[18px] text-white ring-2 ring-[#3b3ac9]">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
      <span className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink-900/95 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </button>
  )
}

const soon = (module: string) =>
  toast.info(module, { description: 'Este módulo estará disponible en la próxima versión.' })

interface WorkspaceRailProps {
  conversations: Conversation[]
}

export function WorkspaceRail({ conversations }: WorkspaceRailProps) {
  const unread = countUnread(conversations)

  return (
    <nav className="relative hidden w-[74px] shrink-0 flex-col items-center justify-between overflow-hidden bg-[linear-gradient(170deg,#3d54f2_0%,#4a3fe4_42%,#6d28d9_100%)] px-3 py-5 lg:flex">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-0 size-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-24 -right-20 size-52 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute inset-0 grid-pattern opacity-[0.14]" />
      </div>

      <div className="relative flex flex-col items-center gap-1.5">
        <div className="mb-1 grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          <LogoMark tone="white" className="h-6" />
        </div>

        <div className="my-2.5 h-px w-7 bg-white/20" />

        <RailButton
          label="Conversaciones"
          active
          icon={<MessageSquareText className="size-[19px]" />}
        />
        <RailButton
          label="Espacios de trabajo"
          icon={<LayoutGrid className="size-[19px]" />}
          onClick={() => soon('Espacios de trabajo')}
        />
        <RailButton
          label="Bandeja de entrada"
          icon={<Inbox className="size-[19px]" />}
          badge={unread}
          onClick={() => soon('Bandeja compartida')}
        />
        <RailButton
          label="Contactos"
          icon={<ContactRound className="size-[19px]" />}
          onClick={() => soon('Contactos')}
        />
        <RailButton
          label="Equipos y grupos"
          icon={<UsersRound className="size-[19px]" />}
          onClick={() => soon('Equipos y grupos')}
        />
        <RailButton
          label="Campañas"
          icon={<Megaphone className="size-[19px]" />}
          onClick={() => soon('Campañas')}
        />
        <RailButton
          label="Automatizaciones"
          icon={<Bot className="size-[19px]" />}
          onClick={() => soon('Automatizaciones')}
        />
        <RailButton
          label="Novedades"
          icon={<BellDot className="size-[19px]" />}
          onClick={() => soon('Novedades')}
        />
        <RailButton
          label="Integraciones"
          icon={<GalleryVerticalEnd className="size-[19px]" />}
          onClick={() => soon('Integraciones')}
        />
      </div>

      <div className="relative flex flex-col items-center gap-1.5">
        <RailButton
          label="Invitar a tu equipo"
          icon={<Gift className="size-[19px]" />}
          onClick={() => soon('Invitaciones')}
        />
        <RailButton
          label="Ajustes"
          icon={<Settings className="size-[19px]" />}
          onClick={() => soon('Ajustes')}
        />
        <div className="my-1.5 h-px w-7 bg-white/20" />
        <UserMenu align="left" dark />
      </div>
    </nav>
  )
}
