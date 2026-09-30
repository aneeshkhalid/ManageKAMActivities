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
    const ragStatus = c.req.query('ragStatus')
    const moduleId = c.req.query('moduleId')
    let sql = `SELECT a.*,i.name as institute_name,m.name as module_name FROM audits a LEFT JOIN institutes i ON a.institute_id=i.id LEFT JOIN modules m ON a.module_id=m.id WHERE 1=1`
    const params: unknown[] = []
    if (instituteId) { sql += ` AND a.institute_id=?`; params.push(instituteId) }
    if (ragStatus) { sql += ` AND a.rag_status=?`; params.push(ragStatus) }
    if (moduleId) { sql += ` AND a.module_id=?`; params.push(moduleId) }
    sql += ` ORDER BY a.audit_date DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/adoption-matrix', (c) => {
  try {
    const db = getSqlite()
    const institutes = db.prepare(`SELECT id,name,code FROM institutes WHERE deleted_at IS NULL ORDER BY name`).all()
    const modules = db.prepare(`SELECT id,name,code FROM modules WHERE status='Active' ORDER BY name`).all()
    const adoptionData = db.prepare(`SELECT institute_id,module_id,adoption_pct,is_actively_used,rag_status FROM module_adoption`).all() as Record<string, unknown>[]
    const matrix: Record<number, Record<number, unknown>> = {}
    ;(institutes as Record<string, unknown>[]).forEach(i => { matrix[i.id as number] = {} })
    adoptionData.forEach(a => { if (matrix[a.institute_id as number]) matrix[a.institute_id as number][a.module_id as number] = a })
    return c.json({ success: true, data: { institutes, modules, matrix } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id/institute-adoption', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT AVG(adoption_pct) as avg_adoption FROM module_adoption WHERE institute_id=? AND is_actively_used=1`).get(c.req.param('id')) as { avg_adoption: number | null }
    return c.json({ success: true, data: row.avg_adoption ?? 0 })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT a.*,i.name as institute_name,m.name as module_name FROM audits a LEFT JOIN institutes i ON a.institute_id=i.id LEFT JOIN modules m ON a.module_id=m.id WHERE a.id=?`).get(c.req.param('id'))
    return c.json({ success: true, data: row ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const user = getUser(c)
    const score = ((data.usageScore ?? 0) * 0.30 + (data.adoptionScore ?? 0) * 0.25 + (data.qualityScore ?? 0) * 0.20 + (data.trainingScore ?? 0) * 0.15)
    const rag = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red'
    const r = getSqlite().prepare(`INSERT INTO audits (audit_date,institute_id,location_id,module_id,usage_status,user_adoption,data_quality,training_status,has_issues,has_requirements,recommendation,rag_status,overall_score,audited_by,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.auditDate??today(),data.instituteId,data.locationId??null,data.moduleId,data.usageStatus,data.userAdoption,data.dataQuality,data.trainingStatus,data.hasIssues?1:0,data.hasRequirements?1:0,data.recommendation??null,data.ragStatus??rag,data.overallScore??score,user.fullName??null,data.notes??null)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE audits SET usage_status=?,user_adoption=?,data_quality=?,training_status=?,has_issues=?,has_requirements=?,recommendation=?,rag_status=?,overall_score=?,notes=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.usageStatus,data.userAdoption,data.dataQuality,data.trainingStatus,data.hasIssues?1:0,data.hasRequirements?1:0,data.recommendation??null,data.ragStatus,data.overallScore??null,data.notes??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM audits WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
