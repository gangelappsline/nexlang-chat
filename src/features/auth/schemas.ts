import { z } from 'zod'

import { EMAIL_PATTERN, USERNAME_PATTERN } from '@/lib/format'

export const identifierSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo o usuario.')
    .min(3, 'Debe tener al menos 3 caracteres.')
    .superRefine((value, ctx) => {
      if (value.includes('@')) {
        if (!EMAIL_PATTERN.test(value)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Escribe un correo válido, por ejemplo nombre@empresa.com.',
          })
        }
        return
      }

      if (!USERNAME_PATTERN.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Tu usuario debe tener entre 3 y 32 caracteres: letras, números, punto o guion.',
        })
      }
    }),
})

export const codeSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, 'Ingresa los 6 dígitos que enviamos a tu correo.'),
})

export type IdentifierFormValues = z.infer<typeof identifierSchema>
export type CodeFormValues = z.infer<typeof codeSchema>
