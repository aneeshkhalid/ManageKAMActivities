import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT id,username,full_name,email,role,status,last_login,created_at FROM users ORDER BY full_name`).all()
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT id,username,full_name,email,role,status,last_login,created_at FROM users WHERE id=?`).get(c.req.param('id'))
    return c.json({ success: true, data: row ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const db = getSqlite()
    const hash = await bcrypt.hash(data.password, 12)
    const r = db.prepare(`INSERT INTO users (username,password_hash,full_name,email,role,status) VALUES (?,?,?,?,?,?)`)
      .run(data.username, hash, data.fullName, data.email ?? null, data.role ?? 'user', 'active')
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE users SET full_name=?,email=?,role=?,status=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.fullName, data.email ?? null, data.role ?? 'user', data.status ?? 'active', c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`UPDATE users SET status='inactive' WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/reset-password', async (c) => {
  try {
    const { newPassword } = await c.req.json()
    const hash = await bcrypt.hash(newPassword, 12)
    getSqlite().prepare(`UPDATE users SET password_hash=?,updated_at=datetime('now') WHERE id=?`).run(hash, c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
