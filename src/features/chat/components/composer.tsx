import {
  AtSign,
  FileText,
  Paperclip,
  SendHorizontal,
  Smile,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

import { IconButton } from '@/components/ui/button'
import { Dropdown, MenuItem, MenuLabel } from '@/components/ui/dropdown'
import { cn } from '@/lib/cn'
import type { MessageAttachment } from '@/types'

import type { SendMessagePayload } from '../api'

const EMOJIS = ['😊', '🙌', '👍', '🎉', '✅', '🙏', '🔥', '💜', '😅', '🤝', '📎', '⚡']

const QUICK_REPLIES = [
  '¡Hola! ¿En qué puedo ayudarte hoy?',
  'Gracias por tu paciencia, lo estoy revisando.',
  '¿Me compartes tu número de referencia?',
  'Ya quedó resuelto ✅ ¿Algo más en lo que pueda ayudarte?',
]

function fileToAttachment(file: File): MessageAttachment {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const kind: MessageAttachment['kind'] =
    extension === 'pdf'
      ? 'pdf'
      : ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)
        ? 'image'
        : ['xls', 'xlsx', 'csv'].includes(extension)
          ? 'sheet'
          : 'doc'

  const size =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`

  return {
    id: `file-${Date.now()}`,
    name: file.name,
    size,
    kind,
  }
}

interface ComposerProps {
  onSend: (payload: SendMessagePayload) => void
  placeholder?: string
  disabled?: boolean
  sending?: boolean
}

export function Composer({
  onSend,
  placeholder = 'Escribe un mensaje…',
  disabled = false,
  sending = false,
}: ComposerProps) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<MessageAttachment | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [text])

  const send = () => {
    const body = text.trim()
    if (!body && !attachment) return
    onSend({ body, ...(attachment ? { attachment } : {}) })
    setText('')
    setAttachment(null)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const insert = (value: string) => {
    setText((current) => (current ? `${current}${current.endsWith(' ') ? '' : ' '}${value}` : value))
    textareaRef.current?.focus()
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setAttachment(fileToAttachment(file))
    event.target.value = ''
  }

  return (
    <div className="border-t border-line bg-white px-3 pb-3 pt-3 sm:px-5">
      <div className="mx-auto max-w-3xl">
        {attachment ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
            <FileText className="size-4 text-brand-600" />
            <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-700">
              {attachment.name}
            </p>
            <span className="text-[11px] text-ink-400">{attachment.size}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Quitar archivo"
              className="grid size-6 place-items-center rounded-md text-ink-400 hover:bg-white hover:text-ink-700"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            'rounded-2xl bg-white ring-1 ring-line-strong transition-all',
            'focus-within:ring-2 focus-within:ring-brand-500/70 hover:ring-ink-300',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholder}
            aria-label="Escribe un mensaje"
            className="block max-h-40 w-full resize-none bg-transparent px-4 pt-3 text-[13.5px] leading-relaxed text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />

          <div className="flex items-center gap-1 px-2 pb-2 pt-1">
            <Dropdown
              align="left"
              panelClassName="w-[248px]"
              trigger={({ toggle }) => (
                <IconButton label="Emojis" size="sm" onClick={toggle}>
                  <Smile className="size-[17px]" />
                </IconButton>
              )}
            >
              {({ close }) => (
                <div className="grid grid-cols-6 gap-1 p-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        insert(emoji)
                        close()
                      }}
                      className="grid size-8 place-items-center rounded-lg text-lg transition-colors hover:bg-surface"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>

            <IconButton
              label="Adjuntar archivo"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip className="size-[17px]" />
            </IconButton>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

            <Dropdown
              align="left"
              panelClassName="w-[288px]"
              trigger={({ toggle }) => (
                <IconButton label="Respuestas rápidas" size="sm" onClick={toggle}>
                  <Zap className="size-[17px]" />
                </IconButton>
              )}
            >
              {({ close }) => (
                <>
                  <MenuLabel>Respuestas rápidas</MenuLabel>
                  {QUICK_REPLIES.map((reply) => (
                    <MenuItem
                      key={reply}
                      icon={<Sparkles className="size-3.5" />}
                      onClick={() => {
                        insert(reply)
                        close()
                      }}
                    >
                      <span className="line-clamp-2 whitespace-normal text-left">{reply}</span>
                    </MenuItem>
                  ))}
                </>
              )}
            </Dropdown>

            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

            <IconButton label="Mencionar a alguien" size="sm" onClick={() => insert('@')}>
              <AtSign className="size-[17px]" />
            </IconButton>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[10.5px] text-ink-400 sm:block">
                <kbd className="rounded border border-line bg-surface px-1 py-0.5 font-sans">Enter</kbd>{' '}
                para enviar
              </span>
              <button
                type="button"
                onClick={send}
                disabled={(!text.trim() && !attachment) || sending}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[12.5px] font-semibold text-white transition-all',
                  'hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-40',
                  'shadow-[0_10px_24px_-14px_rgba(61,84,242,0.9)]',
                )}
              >
                Enviar
                <SendHorizontal className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
