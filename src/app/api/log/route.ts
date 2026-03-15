import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { level = 'log', tag = 'client', message, data } = body as {
    level?: string
    tag?: string
    message: string
    data?: unknown
  }

  const prefix = `[CLIENT:${tag.toUpperCase()}]`
  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log

  if (data !== undefined) {
    logFn(prefix, message, JSON.stringify(data))
  } else {
    logFn(prefix, message)
  }

  return NextResponse.json({ ok: true })
}
