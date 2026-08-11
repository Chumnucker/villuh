/**
 * Auth proxy — forwards all /api/auth/* requests to the Express API and
 * explicitly forwards ALL response headers including Set-Cookie back to the
 * browser. This is the canonical Better Auth pattern for Next.js (not rewrites,
 * which strip Set-Cookie from upstream responses).
 */
import type { NextRequest } from 'next/server'

const API_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000'

async function handler(req: NextRequest): Promise<Response> {
  const url = new URL(req.url)
  const target = `${API_URL}${url.pathname}${url.search}`

  const headers = new Headers(req.headers)

  const init: RequestInit & { duplex?: string } = { method: req.method, headers }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body
    init.duplex = 'half' // required for streaming request bodies in Node.js fetch
  }

  const upstream = await fetch(target, init)

  // Forward every response header — Set-Cookie must reach the browser intact
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
