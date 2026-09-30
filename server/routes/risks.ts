import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const status = c.req.query('status')
    const riskLevel = c.req.query('riskLevel')
    let sql = `SELECT r.*,i.name as institute_name FROM risks r LEFT JOIN institutes i ON r.institute_id=i.id WHERE 1=1`
    const params: unknown[] = []
    if (status) { sql += ` AND r.status=?`; params.push(status) }
    if (riskLevel) { sql += ` AND r.risk_level=?`; params.push(riskLevel) }
    sql += ` ORDER BY r.risk_score DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM risks WHERE id=?`).get(c.req.param('id')) ?? null })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const db = getSqlite()
    const cnt = (db.prepare(`SELECT COUNT(*) as cnt FROM risks`).get() as { cnt: number }).cnt
    const ref = `RSK-${String(cnt + 1).padStart(4, '0')}`
    const prob = Number(data.probability); const imp = Number(data.impact)
    const score = prob * imp
    const level = score >= 17 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low'
    const r = db.prepare(`INSERT INTO risks (risk_ref,description,institute_id,project,probability,impact,risk_score,risk_level,mitigation,owner,due_date,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(ref,data.description,data.instituteId??null,data.project??null,prob,imp,score,level,data.mitigation??null,data.owner??null,data.dueDate??null,'open')
    return c.json({ success: true, data: { id: r.lastInsertRowid, riskRef: ref } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    const prob = Number(data.probability); const imp = Number(data.impact)
    const score = prob * imp
    const level = score >= 17 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low'
    getSqlite().prepare(`UPDATE risks SET description=?,probability=?,impact=?,risk_score=?,risk_level=?,mitigation=?,owner=?,due_date=?,status=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.description,prob,imp,score,level,data.mitigation??null,data.owner??null,data.dueDate??null,data.status??'open',c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM risks WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
