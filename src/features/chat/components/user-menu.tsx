import { CircleUser, LogOut, Settings, Sparkles, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Dropdown, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/dropdown'
import { cn } from '@/lib/cn'
import { useCurrentUser } from '@/features/auth/session'
import { useLogout } from '@/features/auth/hooks'

interface UserMenuProps {
  align?: 'left' | 'right'
  size?: 'sm' | 'md'
  dark?: boolean
  className?: string
}

export function UserMenu({ align = 'right', size = 'md', dark = false, className }: UserMenuProps) {
  const user = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Sesión cerrada', { description: 'Vuelve cuando quieras.' })
        navigate('/login', { replace: true })
      },
    })
  }

  return (
    <Dropdown
      align={align}
      className={className}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Menú de cuenta"
          className={cn(
            'group relative rounded-full transition-transform hover:scale-[1.03]',
            dark && 'ring-2 ring-white/25',
          )}
        >
          <Avatar name={user.name} size={size === 'sm' ? 'sm' : 'md'} presence="online" />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-surface px-2.5 py-2.5">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink-900">{user.name}</p>
              <p className="truncate text-[11.5px] text-ink-500">{user.email}</p>
            </div>
          </div>
          <div className="mt-1.5">
            <MenuLabel>{user.workspace}</MenuLabel>
            <MenuItem
              icon={<UserRound className="size-4" />}
              onClick={() => {
                close()
                toast.info('Perfil', { description: 'La edición de perfil llegará pronto.' })
              }}
            >
              Mi perfil
            </MenuItem>
            <MenuItem
              icon={<CircleUser className="size-4" />}
              onClick={() => {
                close()
                toast.success('Estado actualizado', { description: 'Ahora apareces como disponible.' })
              }}
            >
              Estado: disponible
            </MenuItem>
            <MenuItem
              icon={<Sparkles className="size-4" />}
              onClick={() => {
                close()
                toast.info('Plan Enterprise', {
                  description: 'Tu espacio de trabajo ya incluye todas las funciones.',
                })
              }}
            >
              Plan y facturación
            </MenuItem>
            <MenuItem
              icon={<Settings className="size-4" />}
              onClick={() => {
                close()
                toast.info('Ajustes', { description: 'Configuración del espacio en construcción.' })
              }}
            >
              Ajustes del espacio
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<LogOut className="size-4" />}
              danger
              disabled={logout.isPending}
              onClick={() => {
                close()
                handleLogout()
              }}
            >
              {logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </MenuItem>
          </div>
        </>
      )}
    </Dropdown>
  )
}
