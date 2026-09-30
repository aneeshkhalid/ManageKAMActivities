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
    let sql = `SELECT ts.*,i.name as institute_name,m.name as module_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id LEFT JOIN modules m ON ts.module_id=m.id WHERE 1=1`
    const params: unknown[] = []
    if (instituteId) { sql += ` AND ts.institute_id=?`; params.push(instituteId) }
    if (status) { sql += ` AND ts.status=?`; params.push(status) }
    sql += ` ORDER BY ts.training_date DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const db = getSqlite()
    const session = db.prepare(`SELECT ts.*,i.name as institute_name,m.name as module_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id LEFT JOIN modules m ON ts.module_id=m.id WHERE ts.id=?`).get(c.req.param('id'))
    const participants = db.prepare(`SELECT * FROM training_participants WHERE session_id=? ORDER BY participant_name`).all(c.req.param('id'))
    return c.json({ success: true, data: { ...(session as object), participants } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const user = getUser(c)
    const r = getSqlite().prepare(`INSERT INTO training_sessions (training_date,institute_id,location_id,module_id,topic,trainer,target_audience,participant_count,actual_attendance,duration_hours,training_type,feedback,issues_raised,follow_up_required,next_training_date,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.trainingDate??today(),data.instituteId,data.locationId??null,data.moduleId??null,data.topic,data.trainer??null,data.targetAudience??null,data.participantCount??null,data.actualAttendance??null,data.durationHours??null,data.trainingType??'group',data.feedback??null,data.issuesRaised??null,data.followUpRequired?1:0,data.nextTrainingDate??null,data.status??'Planned',user.id)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE training_sessions SET topic=?,trainer=?,target_audience=?,participant_count=?,actual_attendance=?,duration_hours=?,training_type=?,feedback=?,issues_raised=?,follow_up_required=?,next_training_date=?,status=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.topic,data.trainer??null,data.targetAudience??null,data.participantCount??null,data.actualAttendance??null,data.durationHours??null,data.trainingType??'group',data.feedback??null,data.issuesRaised??null,data.followUpRequired?1:0,data.nextTrainingDate??null,data.status??'Planned',c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM training_sessions WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id/participants', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT * FROM training_participants WHERE session_id=? ORDER BY participant_name`).all(c.req.param('id'))
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/participants', async (c) => {
  try {
    const { participants } = await c.req.json()
    const db = getSqlite()
    const sessionId = c.req.param('id')
    ;(participants as Record<string, unknown>[]).forEach(p => {
      db.prepare(`INSERT INTO training_participants (session_id,participant_name,department,role,attended) VALUES (?,?,?,?,?)`)
        .run(sessionId, p.participantName, p.department ?? null, p.role ?? null, p.attended ? 1 : 1)
    })
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/participants/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE training_participants SET attended=?,feedback=?,follow_up_required=? WHERE id=?`)
      .run(data.attended?1:0,data.feedback??null,data.followUpRequired?1:0,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/participants/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM training_participants WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
