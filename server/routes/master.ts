import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth, getUser } from '../middleware/auth'
import { writeAuditLog } from '../services/audit.service'

// ─── Locations ──────────────────────────────────────────────────────
export const locationsRouter = new Hono()
locationsRouter.use('*', requireAuth)

locationsRouter.get('/', (c) => {
  try {
    const db = getSqlite()
    const instituteId = c.req.query('instituteId')
    const status = c.req.query('status')
    let sql = `SELECT l.*,i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id=i.id WHERE 1=1`
    const params: unknown[] = []
    if (instituteId) { sql += ` AND l.institute_id=?`; params.push(instituteId) }
    if (status) { sql += ` AND l.status=?`; params.push(status) }
    sql += ` ORDER BY i.name,l.name`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

locationsRouter.get('/by-institute/:instituteId', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT * FROM locations WHERE institute_id=? ORDER BY name`).all(c.req.param('instituteId'))
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

locationsRouter.get('/:id', (c) => {
  try {
    const row = getSqlite().prepare(`SELECT l.*,i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id=i.id WHERE l.id=?`).get(c.req.param('id'))
    return c.json({ success: true, data: row ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

locationsRouter.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const user = getUser(c)
    const db = getSqlite()
    const r = db.prepare(`INSERT INTO locations (institute_id,name,city,emirate,address,contact_person,contact_number,email,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(data.instituteId,data.name,data.city??null,data.emirate??null,data.address??null,data.contactPerson??null,data.contactNumber??null,data.email??null,data.status??'Active',data.notes??null)
    writeAuditLog({ userId: user.id, module: 'locations', recordId: Number(r.lastInsertRowid), action: 'create', newValue: data })
    const row = db.prepare(`SELECT l.*,i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id=i.id WHERE l.id=?`).get(r.lastInsertRowid)
    return c.json({ success: true, data: row })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

locationsRouter.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    const id = c.req.param('id')
    const user = getUser(c)
    const db = getSqlite()
    db.prepare(`UPDATE locations SET name=?,city=?,emirate=?,address=?,contact_person=?,contact_number=?,email=?,status=?,notes=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.name,data.city??null,data.emirate??null,data.address??null,data.contactPerson??null,data.contactNumber??null,data.email??null,data.status??'Active',data.notes??null,id)
    writeAuditLog({ userId: user.id, module: 'locations', recordId: Number(id), action: 'update', newValue: data })
    const row = db.prepare(`SELECT l.*,i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id=i.id WHERE l.id=?`).get(id)
    return c.json({ success: true, data: row })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

locationsRouter.delete('/:id', (c) => {
  try {
    const id = c.req.param('id')
    const user = getUser(c)
    getSqlite().prepare(`DELETE FROM locations WHERE id=?`).run(id)
    writeAuditLog({ userId: user.id, module: 'locations', recordId: Number(id), action: 'delete' })
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

// ─── Departments ─────────────────────────────────────────────────────
export const departmentsRouter = new Hono()
departmentsRouter.use('*', requireAuth)

departmentsRouter.get('/', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM departments ORDER BY name`).all() })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

departmentsRouter.get('/by-institute/:instituteId', (c) => {
  // Departments are global — return all
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM departments ORDER BY name`).all() })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

departmentsRouter.get('/:id', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM departments WHERE id=?`).get(c.req.param('id')) ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

departmentsRouter.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO departments (institute_id,name,code,status,description) VALUES (NULL,?,?,?,?)`)
      .run(data.name,data.code??null,data.status??'Active',data.description??null)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

departmentsRouter.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE departments SET name=?,code=?,status=?,description=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.name,data.code??null,data.status??'Active',data.description??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

departmentsRouter.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM departments WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

// ─── Modules ─────────────────────────────────────────────────────────
export const modulesRouter = new Hono()
modulesRouter.use('*', requireAuth)

modulesRouter.get('/', (c) => {
  try {
    const db = getSqlite()
    const status = c.req.query('status')
    let sql = `SELECT * FROM modules WHERE 1=1`
    const params: unknown[] = []
    if (status) { sql += ` AND status=?`; params.push(status) }
    sql += ` ORDER BY name`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

modulesRouter.get('/:id', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM modules WHERE id=?`).get(c.req.param('id')) ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

modulesRouter.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const r = getSqlite().prepare(`INSERT INTO modules (code,name,product,category,description,status,owner,notes) VALUES (?,?,?,?,?,?,?,?)`)
      .run(data.code,data.name,data.product??null,data.category??null,data.description??null,data.status??'Active',data.owner??null,data.notes??null)
    return c.json({ success: true, data: { id: r.lastInsertRowid } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

modulesRouter.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE modules SET name=?,product=?,category=?,description=?,status=?,owner=?,notes=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.name,data.product??null,data.category??null,data.description??null,data.status??'Active',data.owner??null,data.notes??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

modulesRouter.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM modules WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})
