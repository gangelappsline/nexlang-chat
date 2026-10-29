import { zodResolver } from '@hookform/resolvers/zod'
import { AtSign, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { getErrorMessage, getFieldErrors } from '@/lib/api/errors'

import { identifierSchema, type IdentifierFormValues } from '../schemas'

interface IdentifierStepProps {
  onSubmit: (identifier: string) => void
  loading: boolean
  error?: unknown
}

const DEMO_ACCOUNT = 'devon.lane@nexlang.io'

export function IdentifierStep({ onSubmit, loading, error }: IdentifierStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<IdentifierFormValues>({
    resolver: zodResolver(identifierSchema),
    defaultValues: { identifier: '' },
    mode: 'onSubmit',
  })

  const serverError =
    getFieldErrors(error)?.identifier?.[0] ?? (error ? getErrorMessage(error) : undefined)

  const submit = handleSubmit((values) => onSubmit(values.identifier.trim()))

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
        Ingresa con tu correo corporativo o tu usuario del espacio de trabajo. Te enviaremos un
        código de un solo uso para confirmar tu identidad.
      </p>

      <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
        <Field
          label="Correo o usuario"
          htmlFor="identifier"
          error={errors.identifier?.message ?? serverError}
        >
          <Input
            id="identifier"
            autoFocus
            autoComplete="username"
            placeholder="nombre@empresa.com"
            icon={<AtSign className="size-4" />}
            invalid={Boolean(errors.identifier || serverError)}
            {...register('identifier')}
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

        <div className="flex items-start gap-2 rounded-xl bg-surface px-3.5 py-3 ring-1 ring-inset ring-line">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-ink-600">¿Quieres probar la demo?</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">
              Usa la cuenta de ejemplo y el código que aparece en pantalla.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setValue('identifier', DEMO_ACCOUNT, { shouldValidate: true })}
            className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-brand-700 ring-1 ring-line transition-colors hover:bg-brand-50"
          >
            Usar demo
          </button>
        </div>
      </form>

      <p className="mt-7 border-t border-line pt-5 text-[12.5px] leading-relaxed text-ink-400">
        El acceso es por invitación. Si no tienes cuenta, pide a un administrador de tu espacio de
        trabajo que te invite a <span className="font-medium text-ink-600">Nexlang HQ</span>.
      </p>
    </div>
  )
}
