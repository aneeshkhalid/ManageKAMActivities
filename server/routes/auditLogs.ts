import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const module = c.req.query('module')
    const action = c.req.query('action')
    let sql = `SELECT al.*,u.full_name as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id=u.id WHERE 1=1`
    const params: unknown[] = []
    if (module) { sql += ` AND al.module=?`; params.push(module) }
    if (action) { sql += ` AND al.action=?`; params.push(action) }
    sql += ` ORDER BY al.created_at DESC LIMIT 500`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
