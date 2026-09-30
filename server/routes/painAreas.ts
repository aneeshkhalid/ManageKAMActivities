import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const severity = c.req.query('severity')
    const status = c.req.query('status')
    const instituteId = c.req.query('instituteId')
    let sql = `SELECT pa.*,i.name as institute_name,m.name as module_name FROM pain_areas pa LEFT JOIN institutes i ON pa.institute_id=i.id LEFT JOIN modules m ON pa.module_id=m.id WHERE 1=1`
    const params: unknown[] = []
    if (severity) { sql += ` AND pa.severity=?`; params.push(severity) }
    if (status) { sql += ` AND pa.status=?`; params.push(status) }
    if (instituteId) { sql += ` AND pa.institute_id=?`; params.push(instituteId) }
    sql += ` ORDER BY pa.created_at DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM pain_areas WHERE id=?`).get(c.req.param('id')) ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO pain_areas (date_identified,institute_id,location_id,dept_id,module_id,reported_by,description,business_impact,frequency,severity,existing_workaround,suggested_solution,owner,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.dateIdentified??today(),data.instituteId,data.locationId??null,data.deptId??null,data.moduleId??null,data.reportedBy??null,data.description,data.businessImpact??null,data.frequency??null,data.severity??'medium',data.existingWorkaround??null,data.suggestedSolution??null,data.owner??null,'Open')
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE pain_areas SET description=?,business_impact=?,frequency=?,severity=?,existing_workaround=?,suggested_solution=?,owner=?,status=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.description,data.businessImpact??null,data.frequency??null,data.severity??'medium',data.existingWorkaround??null,data.suggestedSolution??null,data.owner??null,data.status??'Open',c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM pain_areas WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
