import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT key,value FROM settings ORDER BY key`).all() as { key: string; value: string }[]
    const data: Record<string, string> = {}
    rows.forEach(r => { data[r.key] = r.value })
    return c.json({ success: true, data })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:key', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT value FROM settings WHERE key=?`).get(c.req.param('key')) as { value: string } | undefined
    return c.json({ success: true, data: row?.value ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/set', async (c) => {
  try {
    const { key, value } = await c.req.json()
    getSqlite().prepare(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,datetime('now'))`).run(key, JSON.stringify(value))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/set-many', async (c) => {
  try {
    const settings: Record<string, unknown> = await c.req.json()
    const db = getSqlite()
    for (const [key, value] of Object.entries(settings)) {
      db.prepare(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,datetime('now'))`).run(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
