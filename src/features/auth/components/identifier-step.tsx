import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { getErrorMessage, getFieldErrors } from '@/lib/api/errors'

import { emailSchema, type EmailFormValues } from '../schemas'

interface IdentifierStepProps {
  onSubmit: (email: string) => void
  loading: boolean
  error?: unknown
}

export function IdentifierStep({ onSubmit, loading, error }: IdentifierStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  })

  const serverError =
    getFieldErrors(error)?.email?.[0] ??
    getFieldErrors(error)?.identifier?.[0] ??
    (error ? getErrorMessage(error) : undefined)

  const submit = handleSubmit((values) => onSubmit(values.email.trim()))

  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
        <ShieldCheck className="size-3.5" />
        Acceso seguro sin contraseña
      </span>

      <h1 className="mt-5 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink-900 sm:text-[34px]">
        Bienvenido a Nexlang
      </h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-500">
        Ingresa tu correo electrónico corporativo. Te enviaremos un código de un solo uso para
        confirmar tu identidad y entrar a tu espacio de trabajo.
      </p>

      <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
        <Field
          label="Correo electrónico"
          htmlFor="email"
          error={errors.email?.message ?? serverError}
        >
          <Input
            id="email"
            type="email"
            autoFocus
            autoComplete="email"
            inputMode="email"
            placeholder="nombre@empresa.com"
            icon={<Mail className="size-4" />}
            invalid={Boolean(errors.email || serverError)}
            {...register('email')}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Enviar código de acceso
        </Button>
      </form>

      <p className="mt-7 border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-400">
        El acceso es por invitación. Si tu correo no está registrado, pide a un administrador de tu
        espacio de trabajo que te dé acceso a{' '}
        <span className="font-medium text-ink-600">Nexlang HQ</span>.
      </p>
    </div>
  )
}
