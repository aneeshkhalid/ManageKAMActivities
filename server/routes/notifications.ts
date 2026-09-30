import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100`).all() })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/unread', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM notifications WHERE is_read=0 ORDER BY created_at DESC LIMIT 50`).all() })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/mark-read', (c) => {
  try {
    getSqlite().prepare(`UPDATE notifications SET is_read=1 WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/mark-all-read', (c) => {
  try {
    getSqlite().prepare(`UPDATE notifications SET is_read=1 WHERE is_read=0`).run()
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
