import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM assignments ORDER BY start_date DESC`).all() })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/current', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM assignments WHERE status='Active' LIMIT 1`).get() ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM assignments WHERE id=?`).get(c.req.param('id')) ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO assignments (name,start_date,end_date,objectives,assigned_person,sponsor,status) VALUES (?,?,?,?,?,?,?)`)
      .run(data.name,data.startDate,data.endDate,data.objectives?JSON.stringify(data.objectives):null,data.assignedPerson,data.sponsor??null,data.status??'Active')
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE assignments SET name=?,start_date=?,end_date=?,objectives=?,sponsor=?,status=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.name,data.startDate,data.endDate,data.objectives?JSON.stringify(data.objectives):null,data.sponsor??null,data.status??'Active',c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
