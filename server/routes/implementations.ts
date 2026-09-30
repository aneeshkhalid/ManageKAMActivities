import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const implType = c.req.query('implType')
    const status = c.req.query('status')
    const instituteId = c.req.query('instituteId')
    let sql = `SELECT im.*,i.name as institute_name,m.name as module_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id LEFT JOIN modules m ON im.module_id=m.id WHERE 1=1`
    const params: unknown[] = []
    if (implType) { sql += ` AND im.impl_type=?`; params.push(implType) }
    if (status) { sql += ` AND im.status=?`; params.push(status) }
    if (instituteId) { sql += ` AND im.institute_id=?`; params.push(instituteId) }
    sql += ` ORDER BY im.created_at DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/pending-modules', (c) => {
  try {
    const db = getSqlite()
    const status = c.req.query('status')
    const instituteId = c.req.query('instituteId')
    let sql = `SELECT pm.*,i.name as institute_name,m.name as module_name FROM pending_modules pm LEFT JOIN institutes i ON pm.institute_id=i.id LEFT JOIN modules m ON pm.module_id=m.id WHERE 1=1`
    const params: unknown[] = []
    if (status) { sql += ` AND pm.status=?`; params.push(status) }
    if (instituteId) { sql += ` AND pm.institute_id=?`; params.push(instituteId) }
    sql += ` ORDER BY pm.created_at DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const db = getSqlite()
    const id = c.req.param('id')
    const impl = db.prepare(`SELECT im.*,i.name as institute_name,m.name as module_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id LEFT JOIN modules m ON im.module_id=m.id WHERE im.id=?`).get(id)
    const tasks = db.prepare(`SELECT * FROM implementation_tasks WHERE implementation_id=? ORDER BY sort_order`).all(id)
    return c.json({ success: true, data: { ...(impl as object), tasks } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const db = getSqlite()
    const cnt = (db.prepare(`SELECT COUNT(*) as cnt FROM implementations`).get() as { cnt: number }).cnt
    const ref = `IMPL-${String(cnt + 1).padStart(4, '0')}`
    const r = db.prepare(`INSERT INTO implementations (impl_ref,project_name,impl_type,institute_id,location_id,module_id,start_date,target_date,owner,status,progress_pct,dependency,risk_notes,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(ref,data.projectName,data.implType??'other',data.instituteId,data.locationId??null,data.moduleId??null,data.startDate??null,data.targetDate??null,data.owner??null,data.status??'not_started',0,data.dependency??null,data.riskNotes??null,data.remarks??null)
    return c.json({ success: true, data: { id: r.lastInsertRowid, implRef: ref } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE implementations SET project_name=?,impl_type=?,status=?,progress_pct=?,target_date=?,actual_completion=?,owner=?,dependency=?,risk_notes=?,remarks=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.projectName,data.implType??'other',data.status??'not_started',data.progressPct??0,data.targetDate??null,data.actualCompletion??null,data.owner??null,data.dependency??null,data.riskNotes??null,data.remarks??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM implementations WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id/tasks', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM implementation_tasks WHERE implementation_id=? ORDER BY sort_order`).all(c.req.param('id')) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/tasks', async (c) => {
  try {
    const data = await c.req.json()
    const db = getSqlite()
    if (data.id) {
      db.prepare(`UPDATE implementation_tasks SET task_name=?,assignee=?,start_date=?,target_date=?,actual_date=?,status=?,notes=?,sort_order=? WHERE id=?`)
        .run(data.taskName,data.assignee??null,data.startDate??null,data.targetDate??null,data.actualDate??null,data.status??'not_started',data.notes??null,data.sortOrder??0,data.id)
    } else {
      db.prepare(`INSERT INTO implementation_tasks (implementation_id,task_name,assignee,start_date,target_date,status,notes,sort_order) VALUES (?,?,?,?,?,?,?,?)`)
        .run(data.implementationId,data.taskName,data.assignee??null,data.startDate??null,data.targetDate??null,data.status??'not_started',data.notes??null,data.sortOrder??0)
    }
    const stats = db.prepare(`SELECT COUNT(*) as total,COUNT(CASE WHEN status='completed' THEN 1 END) as done FROM implementation_tasks WHERE implementation_id=?`).get(data.implementationId) as { total: number; done: number }
    const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0
    db.prepare(`UPDATE implementations SET progress_pct=?,updated_at=datetime('now') WHERE id=?`).run(pct, data.implementationId)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/tasks/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM implementation_tasks WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

// ─── Pending Modules ──────────────────────────────────────────
app.post('/pending-modules', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO pending_modules (institute_id,location_id,module_id,current_status,reason_pending,dependency,action_required,owner,target_date,status,escalation_required,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.instituteId,data.locationId??null,data.moduleId,data.currentStatus??null,data.reasonPending??null,data.dependency??null,data.actionRequired??null,data.owner??null,data.targetDate??null,'Pending',data.escalationRequired?1:0,data.remarks??null)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/pending-modules/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE pending_modules SET current_status=?,reason_pending=?,dependency=?,action_required=?,owner=?,target_date=?,status=?,escalation_required=?,remarks=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.currentStatus??null,data.reasonPending??null,data.dependency??null,data.actionRequired??null,data.owner??null,data.targetDate??null,data.status??'Pending',data.escalationRequired?1:0,data.remarks??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/pending-modules/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM pending_modules WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
