import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

// Dependencies
app.get('/dependencies', (c) => {
  try {
    const db = getSqlite()
    const status = c.req.query('status')
    let sql = `SELECT * FROM dependencies WHERE 1=1`
    const params: unknown[] = []
    if (status) { sql += ` AND status=?`; params.push(status) }
    sql += ` ORDER BY created_at DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/dependencies', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO dependencies (description,related_type,related_id,dependency_on,owner,required_by_date,status,impact_if_blocked,escalation_required) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(data.description,data.relatedType??null,data.relatedId??null,data.dependencyOn,data.owner??null,data.requiredByDate??null,data.status??'Pending',data.impactIfBlocked??null,data.escalationRequired?1:0)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/dependencies/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE dependencies SET description=?,dependency_on=?,owner=?,required_by_date=?,status=?,impact_if_blocked=?,escalation_required=? WHERE id=?`)
      .run(data.description,data.dependencyOn,data.owner??null,data.requiredByDate??null,data.status??'Pending',data.impactIfBlocked??null,data.escalationRequired?1:0,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/dependencies/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM dependencies WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

// Compliance
app.get('/compliance', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT ci.*,i.name as institute_name FROM compliance_items ci LEFT JOIN institutes i ON ci.institute_id=i.id ORDER BY ci.created_at DESC`).all() })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/compliance/:id', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM compliance_items WHERE id=?`).get(c.req.param('id')) ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/compliance', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO compliance_items (compliance_area,institute_id,dept_id,current_status,gap_description,action_required,owner,target_date,evidence,status,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.complianceArea,data.instituteId??null,data.deptId??null,data.currentStatus,data.gapDescription??null,data.actionRequired??null,data.owner??null,data.targetDate??null,data.evidence??null,data.status??'Not Started',data.remarks??null)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/compliance/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE compliance_items SET compliance_area=?,current_status=?,gap_description=?,action_required=?,owner=?,target_date=?,evidence=?,status=?,remarks=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.complianceArea,data.currentStatus,data.gapDescription??null,data.actionRequired??null,data.owner??null,data.targetDate??null,data.evidence??null,data.status??'Not Started',data.remarks??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/compliance/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM compliance_items WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

// App info
app.get('/version', (c) => {
  return c.json({ success: true, data: '1.0.0' })
})

export default app
