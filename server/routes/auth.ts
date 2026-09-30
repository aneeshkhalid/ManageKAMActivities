import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { getSqlite } from '../db'
import { signToken, requireAuth, getUser } from '../middleware/auth'
import { writeAuditLog } from '../services/audit.service'

const app = new Hono()

app.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    const db = getSqlite()
    const user = db.prepare(
      `SELECT id,username,password_hash,full_name,email,role,status FROM users WHERE username=? AND status='active' LIMIT 1`
    ).get(username) as Record<string, unknown> | undefined
    if (!user) return c.json({ success: false, error: 'Invalid username or password' })
    const valid = await bcrypt.compare(password, user.password_hash as string)
    if (!valid) return c.json({ success: false, error: 'Invalid username or password' })
    db.prepare(`UPDATE users SET last_login=datetime('now') WHERE id=?`).run(user.id as number)
    const payload = {
      id: user.id as number,
      username: user.username as string,
      fullName: user.full_name as string,
      email: user.email as string | null,
      role: user.role as 'admin' | 'portfolio_manager' | 'management' | 'user',
      status: user.status as string
    }
    const token = signToken(payload)
    writeAuditLog({ userId: payload.id, module: 'auth', action: 'login', newValue: { username }, ipAddress: c.req.header('x-forwarded-for') ?? null })
    return c.json({ success: true, data: { user: payload, token } })
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message })
  }
})

app.post('/logout', requireAuth, (c) => {
  const user = getUser(c)
  writeAuditLog({ userId: user.id, module: 'auth', action: 'logout' })
  return c.json({ success: true })
})

app.get('/me', requireAuth, (c) => {
  return c.json({ success: true, data: getUser(c) })
})

app.post('/change-password', requireAuth, async (c) => {
  try {
    const { currentPassword, newPassword } = await c.req.json()
    const user = getUser(c)
    const db = getSqlite()
    const row = db.prepare(`SELECT password_hash FROM users WHERE id=?`).get(user.id) as { password_hash: string } | undefined
    if (!row) return c.json({ success: false, error: 'User not found' })
    const valid = await bcrypt.compare(currentPassword, row.password_hash)
    if (!valid) return c.json({ success: false, error: 'Current password is incorrect' })
    const newHash = await bcrypt.hash(newPassword, 12)
    db.prepare(`UPDATE users SET password_hash=?,updated_at=datetime('now') WHERE id=?`).run(newHash, user.id)
    return c.json({ success: true })
  } catch (err) {
    return c.json({ success: false, error: (err as Error).message })
  }
})

export default app
