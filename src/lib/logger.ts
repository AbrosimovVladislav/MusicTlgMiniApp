type LogLevel = 'log' | 'warn' | 'error'

function send(level: LogLevel, tag: string, message: string, data?: unknown) {
  const payload: Record<string, unknown> = { level, tag, message }
  if (data !== undefined) payload.data = data

  // Fire-and-forget — не блокируем основной поток
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {/* silent */})
}

export const logger = {
  log: (tag: string, message: string, data?: unknown) => send('log', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => send('warn', tag, message, data),
  error: (tag: string, message: string, data?: unknown) => send('error', tag, message, data),
}
