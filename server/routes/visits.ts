import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth, getUser } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const instituteId = c.req.query('instituteId')
    const status = c.req.query('status')
    let sql = `SELECT v.*,i.name as institute_name,l.name as location_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id LEFT JOIN locations l ON v.location_id=l.id WHERE 1=1`
    const params: unknown[] = []
    if (instituteId) { sql += ` AND v.institute_id=?`; params.push(instituteId) }
    if (status) { sql += ` AND v.status=?`; params.push(status) }
    sql += ` ORDER BY v.visit_date DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT v.*,i.name as institute_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id WHERE v.id=?`).get(c.req.param('id'))
    return c.json({ success: true, data: row ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const user = getUser(c)
    const r = getSqlite().prepare(`INSERT INTO institute_visits (visit_date,institute_id,location_id,purpose,participants,modules_discussed,findings,pain_areas_noted,training_required,next_visit_date,remarks,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.visitDate ?? today(),data.instituteId,data.locationId??null,data.purpose,data.participants??null,data.modulesDiscussed??null,data.findings??null,data.painAreasNoted??null,data.trainingRequired??null,data.nextVisitDate??null,data.remarks??null,data.status??'Completed',user.id)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE institute_visits SET purpose=?,participants=?,modules_discussed=?,findings=?,pain_areas_noted=?,training_required=?,next_visit_date=?,remarks=?,status=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.purpose,data.participants??null,data.modulesDiscussed??null,data.findings??null,data.painAreasNoted??null,data.trainingRequired??null,data.nextVisitDate??null,data.remarks??null,data.status??'Completed',c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM institute_visits WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
