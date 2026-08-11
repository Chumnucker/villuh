import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './modules/auth/index.js'
import type { Request, Response } from 'express'

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const headers = fromNodeHeaders(req.headers)
  const session = await auth.api.getSession({ headers })
  return {
    req,
    res,
    headers,
    user: session?.user ?? null,
    session: session?.session ?? null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
