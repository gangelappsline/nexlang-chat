/**
 * Tono de llamada generado con Web Audio (sin archivos ni librerías externas).
 */
let context: AudioContext | null = null
let interval: ReturnType<typeof setInterval> | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtor) return null

  if (!context) context = new AudioCtor()
  return context
}

function beep(audio: AudioContext, frequency: number, startAt: number, duration: number) {
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(gain).connect(audio.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

function playPattern(audio: AudioContext) {
  const now = audio.currentTime
  beep(audio, 660, now, 0.18)
  beep(audio, 520, now + 0.24, 0.18)
}

/** Empieza a sonar (llamada entrante). */
export function startRingtone() {
  const audio = getContext()
  if (!audio) return

  try {
    void audio.resume()
    playPattern(audio)
  } catch {
    /* el navegador puede bloquear el audio sin interacción del usuario */
  }

  if (interval) clearInterval(interval)
  interval = setInterval(() => {
    try {
      playPattern(audio)
    } catch {
      stopRingtone()
    }
  }, 1600)
}

export function stopRingtone() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}
