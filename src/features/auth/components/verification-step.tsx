import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, MailCheck, RotateCw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { getErrorMessage, getFieldErrors } from '@/lib/api/errors'

import { codeSchema, type CodeFormValues } from '../schemas'
import { OtpInput } from './otp-input'

interface VerificationStepProps {
  email: string
  loading: boolean
  error?: unknown
  seconds: number
  resending: boolean
  onVerify: (code: string) => void
  onResend: () => void
  onBack: () => void
}

export function VerificationStep({
  email,
  loading,
  error,
  seconds,
  resending,
  onVerify,
  onResend,
  onBack,
}: VerificationStepProps) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  })

  const code = useWatch({ control, name: 'code' }) ?? ''
  const lastSubmitted = useRef('')

  const submit = handleSubmit((values) => onVerify(values.code))

  useEffect(() => {
    if (code.length < 6) {
      lastSubmitted.current = ''
      return
    }
    if (code.length === 6 && code !== lastSubmitted.current && !loading) {
      lastSubmitted.current = code
      void submit()
    }
  }, [code, loading, submit])

  const serverError = getFieldErrors(error)?.code?.[0] ?? (error ? getErrorMessage(error) : undefined)
  const resendLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="group -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-[12.5px] font-medium text-ink-500 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
        Cambiar correo
      </button>

      <div className="mt-5 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
        <MailCheck className="size-6" />
      </div>

      <h1 className="mt-4 text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink-900 sm:text-[32px]">
        Revisa tu correo
      </h1>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink-500">
        Enviamos un código de 6 dígitos a{' '}
        <span className="font-semibold text-ink-800">{email}</span>. Ingrésalo para entrar a tu
        espacio de trabajo.
      </p>

      <form
        className="mt-7 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        noValidate
      >
        <OtpInput
          value={code}
          onChange={(value) => setValue('code', value, { shouldValidate: value.length === 6 })}
          disabled={loading}
          invalid={Boolean(errors.code || serverError)}
          autoFocus
        />

        {errors.code?.message || serverError ? (
          <p className="flex items-start gap-1.5 text-[12.5px] font-medium text-rose-600" role="alert">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {errors.code?.message ?? serverError}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          disabled={code.length < 6}
          rightIcon={<ArrowRight className="size-4" />}
        >
          Verificar e ingresar
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px]">
        <span className="text-ink-400">¿No recibiste el código?</span>
        {seconds > 0 ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-ink-400">
            <Loader2 className="size-3.5 animate-spin" />
            Reenviar en {resendLabel}
          </span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="inline-flex items-center gap-1.5 font-semibold text-brand-700 transition-colors hover:text-brand-800 disabled:opacity-50"
          >
            <RotateCw className={`size-3.5 ${resending ? 'animate-spin' : ''}`} />
            Reenviar código
          </button>
        )}
      </div>

      <p className="mt-6 border-t border-line pt-5 text-[12px] leading-relaxed text-ink-400">
        Por seguridad, el código caduca a los pocos minutos y solo puede usarse una vez. Si no
        solicitaste este acceso, ignora este mensaje.
      </p>
    </div>
  )
}
