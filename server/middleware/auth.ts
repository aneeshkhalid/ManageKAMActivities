import type { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'ceim-secret-key-change-in-production'

export interface JWTPayload {
  id: number
  username: string
  fullName: string
  email: string | null
  role: 'admin' | 'portfolio_manager' | 'management' | 'user'
  status: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' })
}

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401)
  }
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401)
  }
}

export function getUser(c: Context): JWTPayload {
  return c.get('user') as JWTPayload
}
