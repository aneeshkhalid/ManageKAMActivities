import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const status = c.req.query('status')
    const category = c.req.query('category')
    let sql = `SELECT * FROM leadership_meetings WHERE 1=1`
    const params: unknown[] = []
    if (status) { sql += ` AND status=?`; params.push(status) }
    if (category) { sql += ` AND category=?`; params.push(category) }
    sql += ` ORDER BY meeting_date DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM leadership_meetings WHERE id=?`).get(c.req.param('id')) ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO leadership_meetings (meeting_date,participants,organization,category,topic,discussion,decisions,requirements_identified,action_items,owner,due_date,status,follow_up_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.meetingDate??today(),data.participants??null,data.organization??null,data.category??'other',data.topic,data.discussion??null,data.decisions??null,data.requirementsIdentified??null,data.actionItems??null,data.owner??null,data.dueDate??null,data.status??'Completed',data.followUpDate??null)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE leadership_meetings SET participants=?,organization=?,category=?,topic=?,discussion=?,decisions=?,requirements_identified=?,action_items=?,owner=?,due_date=?,status=?,follow_up_date=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.participants??null,data.organization??null,data.category??'other',data.topic,data.discussion??null,data.decisions??null,data.requirementsIdentified??null,data.actionItems??null,data.owner??null,data.dueDate??null,data.status??'Completed',data.followUpDate??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM leadership_meetings WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
