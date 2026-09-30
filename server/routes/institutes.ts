import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth, getUser } from '../middleware/auth'
import { writeAuditLog } from '../services/audit.service'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const search = c.req.query('search')
    const status = c.req.query('status')
    let sql = `SELECT i.*,
      (SELECT COUNT(*) FROM locations WHERE institute_id=i.id) as location_count,
      (SELECT COUNT(*) FROM institute_visits WHERE institute_id=i.id) as visit_count,
      (SELECT COUNT(*) FROM requirements WHERE institute_id=i.id AND deleted_at IS NULL) as req_count,
      (SELECT COUNT(*) FROM issues WHERE institute_id=i.id) as issue_count
      FROM institutes i WHERE i.deleted_at IS NULL`
    const params: unknown[] = []
    if (search) { sql += ` AND (i.name LIKE ? OR i.code LIKE ?)`; params.push(`%${search}%`, `%${search}%`) }
    if (status) { sql += ` AND i.status=?`; params.push(status) }
    sql += ` ORDER BY i.name`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id/stats', (c) => {
  try {
    const db = getSqlite()
    const id = c.req.param('id')
    return c.json({
      success: true,
      data: {
        visits: (db.prepare(`SELECT COUNT(*) as cnt FROM institute_visits WHERE institute_id=?`).get(id) as { cnt: number }).cnt,
        audits: (db.prepare(`SELECT COUNT(*) as cnt FROM audits WHERE institute_id=?`).get(id) as { cnt: number }).cnt,
        requirements: (db.prepare(`SELECT COUNT(*) as cnt FROM requirements WHERE institute_id=? AND deleted_at IS NULL`).get(id) as { cnt: number }).cnt,
        issues: (db.prepare(`SELECT COUNT(*) as cnt FROM issues WHERE institute_id=?`).get(id) as { cnt: number }).cnt,
        trainings: (db.prepare(`SELECT COUNT(*) as cnt FROM training_sessions WHERE institute_id=?`).get(id) as { cnt: number }).cnt,
        adoptionPct: (db.prepare(`SELECT AVG(adoption_pct) as avg FROM module_adoption WHERE institute_id=?`).get(id) as { avg: number | null }).avg ?? 0,
      }
    })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT * FROM institutes WHERE id=? AND deleted_at IS NULL`).get(c.req.param('id'))
    return c.json({ success: true, data: row ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const user = getUser(c)
    const db = getSqlite()
    const r = db.prepare(`INSERT INTO institutes (code,name,type,org,description,status,primary_contact,email,phone,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(data.code, data.name, data.type ?? 'School', data.org ?? null, data.description ?? null, data.status ?? 'Active', data.primaryContact ?? null, data.email ?? null, data.phone ?? null, data.notes ?? null)
    writeAuditLog({ userId: user.id, module: 'institutes', recordId: Number(r.lastInsertRowid), action: 'create', newValue: data })
    const row = db.prepare(`SELECT * FROM institutes WHERE id=?`).get(r.lastInsertRowid)
    return c.json({ success: true, data: row })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    const id = c.req.param('id')
    const user = getUser(c)
    const db = getSqlite()
    const old = db.prepare(`SELECT * FROM institutes WHERE id=?`).get(id)
    db.prepare(`UPDATE institutes SET name=?,type=?,org=?,description=?,status=?,primary_contact=?,email=?,phone=?,notes=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.name, data.type, data.org ?? null, data.description ?? null, data.status, data.primaryContact ?? null, data.email ?? null, data.phone ?? null, data.notes ?? null, id)
    writeAuditLog({ userId: user.id, module: 'institutes', recordId: Number(id), action: 'update', oldValue: old, newValue: data })
    const row = db.prepare(`SELECT * FROM institutes WHERE id=?`).get(id)
    return c.json({ success: true, data: row })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    const id = c.req.param('id')
    const user = getUser(c)
    getSqlite().prepare(`UPDATE institutes SET deleted_at=datetime('now') WHERE id=?`).run(id)
    writeAuditLog({ userId: user.id, module: 'institutes', recordId: Number(id), action: 'delete' })
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
