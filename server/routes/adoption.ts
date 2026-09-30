import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const instituteId = c.req.query('instituteId')
    const moduleId = c.req.query('moduleId')
    let sql = `SELECT ma.*,i.name as institute_name,m.name as module_name FROM module_adoption ma LEFT JOIN institutes i ON ma.institute_id=i.id LEFT JOIN modules m ON ma.module_id=m.id WHERE 1=1`
    const params: unknown[] = []
    if (instituteId) { sql += ` AND ma.institute_id=?`; params.push(instituteId) }
    if (moduleId) { sql += ` AND ma.module_id=?`; params.push(moduleId) }
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/matrix', (c) => {
  try {
    const db = getSqlite()
    const institutes = db.prepare(`SELECT id,name,code FROM institutes WHERE deleted_at IS NULL ORDER BY name`).all()
    const modules = db.prepare(`SELECT id,name,code FROM modules WHERE status='Active' ORDER BY name`).all()
    const data = db.prepare(`SELECT * FROM module_adoption`).all()
    return c.json({ success: true, data: { institutes, modules, data } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/upsert', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`INSERT OR REPLACE INTO module_adoption (institute_id,location_id,module_id,is_available,is_configured,is_live,is_actively_used,user_count,usage_frequency,adoption_pct,gap_description,action_required,owner,target_date,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
      .run(data.instituteId,data.locationId??null,data.moduleId,data.isAvailable?1:0,data.isConfigured?1:0,data.isLive?1:0,data.isActivelyUsed?1:0,data.userCount??null,data.usageFrequency??null,data.adoptionPct??null,data.gapDescription??null,data.actionRequired??null,data.owner??null,data.targetDate??null,data.status??'Not Started')
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
