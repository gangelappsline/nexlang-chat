import { SendHorizontal, Smile } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

import { IconButton } from '@/components/ui/button'
import { Dropdown } from '@/components/ui/dropdown'
import { cn } from '@/lib/cn'

const EMOJIS = ['😊', '🙌', '👍', '🎉', '✅', '🙏', '🔥', '💜', '😅', '🤝', '📎', '⚡']

interface ComposerProps {
  onSend: (text: string) => void
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`
  }, [text])

  const send = () => {
    const body = text.trim()
    if (!body || disabled || sending) return
    onSend(body)
    setText('')
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

  return (
    <div className="border-t border-line bg-white px-3 pb-3 pt-3 sm:px-5">
      <div className="mx-auto max-w-3xl">
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

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[10.5px] text-ink-400 sm:block">
                <kbd className="rounded border border-line bg-surface px-1 py-0.5 font-sans">Enter</kbd>{' '}
                para enviar
              </span>
              <button
                type="button"
                onClick={send}
                disabled={!text.trim() || sending || disabled}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[12.5px] font-semibold text-white transition-all',
                  'hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-40',
                  'shadow-[0_10px_24px_-14px_rgba(61,84,242,0.9)]',
                )}
              >
                {sending ? 'Enviando…' : 'Enviar'}
                <SendHorizontal className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
