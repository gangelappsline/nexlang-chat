import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { firstName } from '@/lib/format'
import { useCountdown } from '@/lib/use-countdown'

import type { LoginCodeChallenge } from '../api'
import { AuthLayout } from '../components/auth-layout'
import { IdentifierStep } from '../components/identifier-step'
import { VerificationStep } from '../components/verification-step'
import {
  useRequestLoginCode,
  useResendLoginCode,
  useVerifyLoginCode,
} from '../hooks'

const variants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [challenge, setChallenge] = useState<LoginCodeChallenge | null>(null)

  const requestCode = useRequestLoginCode()
  const resendCode = useResendLoginCode()
  const verifyCode = useVerifyLoginCode()
  const { seconds, restart } = useCountdown(0)

  useEffect(() => {
    document.title = 'Acceso · Nexlang Chat'
  }, [])

  const handleRequest = (email: string) => {
    requestCode.mutate(email, {
      onSuccess: (data) => {
        setChallenge(data)
        restart(data.resendAfterSeconds)
        verifyCode.reset()
        toast.success('Código enviado', {
          description: `Revisa la bandeja de entrada de ${data.email}.`,
        })
      },
    })
  }

  const handleVerify = (code: string) => {
    if (!challenge) return

    verifyCode.mutate(
      { email: challenge.email, code },
      {
        onSuccess: (session) => {
          toast.success(`¡Bienvenido, ${firstName(session.user.name)}!`, {
            description: 'Tu sesión está activa. Cargando tus conversaciones…',
          })

          const from = (location.state as { from?: string } | null)?.from
          navigate(from && from !== '/login' ? from : '/', { replace: true })
        },
      },
    )
  }

  const handleResend = () => {
    if (!challenge) return

    resendCode.mutate(challenge.email, {
      onSuccess: (data) => {
        setChallenge(data)
        restart(data.resendAfterSeconds)
        verifyCode.reset()
        toast.success('Te enviamos un código nuevo', {
          description: 'El código anterior dejó de ser válido.',
        })
      },
      onError: () => {
        toast.error('No pudimos reenviar el código', {
          description: 'Vuelve a solicitar un código de acceso.',
        })
      },
    })
  }

  return (
    <AuthLayout>
      <AnimatePresence mode="wait" initial={false}>
        {challenge ? (
          <motion.div
            key="verification"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.3, 1] }}
          >
            <VerificationStep
              email={challenge.email}
              loading={verifyCode.isPending}
              error={verifyCode.error}
              seconds={seconds}
              resending={resendCode.isPending}
              onVerify={handleVerify}
              onResend={handleResend}
              onBack={() => {
                setChallenge(null)
                verifyCode.reset()
                requestCode.reset()
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="identifier"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.3, 1] }}
          >
            <IdentifierStep
              onSubmit={handleRequest}
              loading={requestCode.isPending}
              error={requestCode.error}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}
