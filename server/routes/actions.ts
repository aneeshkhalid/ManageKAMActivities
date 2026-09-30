import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth, getUser } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

app.get('/', (c) => {
  try {
    const db = getSqlite()
    // Auto-mark overdue
    db.prepare(`UPDATE actions SET status='overdue' WHERE due_date < ? AND status='open'`).run(today())
    const status = c.req.query('status')
    const priority = c.req.query('priority')
    const owner = c.req.query('owner')
    const instituteId = c.req.query('instituteId')
    let sql = `SELECT a.*,i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE 1=1`
    const params: unknown[] = []
    if (status) { sql += ` AND a.status=?`; params.push(status) }
    if (priority) { sql += ` AND a.priority=?`; params.push(priority) }
    if (owner) { sql += ` AND a.owner LIKE ?`; params.push(`%${owner}%`) }
    if (instituteId) { sql += ` AND a.institute_id=?`; params.push(instituteId) }
    sql += ` ORDER BY CASE a.status WHEN 'overdue' THEN 0 WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END,a.due_date`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/overdue', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT a.*,i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.due_date < ? AND a.status IN ('open','in_progress','overdue') ORDER BY a.due_date`).all(today())
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT a.*,i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.id=?`).get(c.req.param('id'))
    return c.json({ success: true, data: row ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const user = getUser(c)
    const db = getSqlite()
    const cnt = (db.prepare(`SELECT COUNT(*) as cnt FROM actions`).get() as { cnt: number }).cnt
    const ref = `ACT-${String(cnt + 1).padStart(4, '0')}`
    const r = db.prepare(`INSERT INTO actions (action_ref,action_date,source_type,source_id,institute_id,module_id,description,owner,priority,due_date,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(ref,data.actionDate??today(),data.sourceType??null,data.sourceId??null,data.instituteId??null,data.moduleId??null,data.description,data.owner??null,data.priority??'medium',data.dueDate??null,'open',user.id)
    return c.json({ success: true, data: { id: r.lastInsertRowid, actionRef: ref } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE actions SET description=?,owner=?,priority=?,due_date=?,status=?,remarks=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.description,data.owner??null,data.priority??'medium',data.dueDate??null,data.status??'open',data.remarks??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/complete', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { remarks?: string }
    getSqlite().prepare(`UPDATE actions SET status='completed',completion_date=?,remarks=?,updated_at=datetime('now') WHERE id=?`)
      .run(today(),body.remarks??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM actions WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
