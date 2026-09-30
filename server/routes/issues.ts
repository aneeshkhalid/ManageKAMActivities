import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth, getUser } from '../middleware/auth'
import { writeAuditLog } from '../services/audit.service'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const status = c.req.query('status')
    const priority = c.req.query('priority')
    const instituteId = c.req.query('instituteId')
    const moduleId = c.req.query('moduleId')
    let sql = `SELECT iss.*,i.name as institute_name,m.name as module_name FROM issues iss LEFT JOIN institutes i ON iss.institute_id=i.id LEFT JOIN modules m ON iss.module_id=m.id WHERE 1=1`
    const params: unknown[] = []
    if (status) { sql += ` AND iss.status=?`; params.push(status) }
    if (priority) { sql += ` AND iss.priority=?`; params.push(priority) }
    if (instituteId) { sql += ` AND iss.institute_id=?`; params.push(instituteId) }
    if (moduleId) { sql += ` AND iss.module_id=?`; params.push(moduleId) }
    sql += ` ORDER BY iss.created_at DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT iss.*,i.name as institute_name FROM issues iss LEFT JOIN institutes i ON iss.institute_id=i.id WHERE iss.id=?`).get(c.req.param('id'))
    return c.json({ success: true, data: row ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const db = getSqlite()
    const year = new Date().getFullYear()
    const cnt = (db.prepare(`SELECT COUNT(*) as cnt FROM issues WHERE issue_ref LIKE ?`).get(`ISS-${year}-%`) as { cnt: number }).cnt
    const ref = `ISS-${year}-${String(cnt + 1).padStart(4, '0')}`
    const r = db.prepare(`INSERT INTO issues (issue_ref,issue_date,institute_id,location_id,module_id,description,category,priority,impact,root_cause,workaround,assigned_to,target_date,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(ref,data.issueDate??today(),data.instituteId,data.locationId??null,data.moduleId??null,data.description,data.category??'functional',data.priority??'medium',data.impact??null,data.rootCause??null,data.workaround??null,data.assignedTo??null,data.targetDate??null,'open')
    return c.json({ success: true, data: { id: r.lastInsertRowid, issueRef: ref } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE issues SET description=?,category=?,priority=?,impact=?,root_cause=?,workaround=?,assigned_to=?,target_date=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.description,data.category??'functional',data.priority??'medium',data.impact??null,data.rootCause??null,data.workaround??null,data.assignedTo??null,data.targetDate??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/change-status', async (c) => {
  try {
    const { status, resolution } = await c.req.json()
    const id = c.req.param('id')
    const user = getUser(c)
    const closedDate = ['resolved','closed'].includes(status) ? today() : null
    getSqlite().prepare(`UPDATE issues SET status=?,resolution=?,closed_date=?,updated_at=datetime('now') WHERE id=?`)
      .run(status,resolution??null,closedDate,id)
    writeAuditLog({ userId: user.id, module: 'issues', recordId: Number(id), action: 'status_change', newValue: status })
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM issues WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
