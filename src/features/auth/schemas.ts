import { z } from 'zod'

import { EMAIL_PATTERN } from '@/lib/format'

export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo electrónico.')
    .superRefine((value, ctx) => {
      if (!EMAIL_PATTERN.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Escribe un correo válido, por ejemplo nombre@empresa.com.',
        })
      }
    }),
})

export const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Ingresa los 6 dígitos que enviamos a tu correo.'),
})

export type EmailFormValues = z.infer<typeof emailSchema>
export type CodeFormValues = z.infer<typeof codeSchema>
