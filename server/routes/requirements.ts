import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth, getUser } from '../middleware/auth'
import { writeAuditLog } from '../services/audit.service'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

const VALID_TRANSITIONS: Record<string, string[]> = {
  identified: ['documented'],
  documented: ['under_review'],
  under_review: ['estimation_pending'],
  estimation_pending: ['estimated'],
  estimated: ['approval_pending'],
  approval_pending: ['approved', 'rejected', 'deferred'],
  approved: ['sprint_planned'],
  rejected: [],
  deferred: ['approval_pending', 'estimated'],
  sprint_planned: ['development'],
  development: ['qa'],
  qa: ['uat'],
  uat: ['released'],
  released: ['closed'],
  closed: [],
}

app.get('/', (c) => {
  try {
    const db = getSqlite()
    const instituteId = c.req.query('instituteId')
    const status = c.req.query('status')
    const priority = c.req.query('priority')
    const moduleId = c.req.query('moduleId')
    const search = c.req.query('search')
    let sql = `SELECT r.*,i.name as institute_name,l.name as location_name,m.name as module_name,d.name as department_name FROM requirements r LEFT JOIN institutes i ON r.institute_id=i.id LEFT JOIN locations l ON r.location_id=l.id LEFT JOIN modules m ON r.module_id=m.id LEFT JOIN departments d ON r.dept_id=d.id WHERE r.deleted_at IS NULL`
    const params: unknown[] = []
    if (instituteId) { sql += ` AND r.institute_id=?`; params.push(instituteId) }
    if (status) { sql += ` AND r.status=?`; params.push(status) }
    if (priority) { sql += ` AND r.priority=?`; params.push(priority) }
    if (moduleId) { sql += ` AND r.module_id=?`; params.push(moduleId) }
    if (search) { sql += ` AND (r.title LIKE ? OR r.req_ref LIKE ?)`; params.push(`%${search}%`, `%${search}%`) }
    sql += ` ORDER BY r.created_at DESC`
    return c.json({ success: true, data: db.prepare(sql).all(...params) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/pipeline-stats', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT status,COUNT(*) as cnt FROM requirements WHERE deleted_at IS NULL GROUP BY status`).all() as { status: string; cnt: number }[]
    const stats: Record<string, number> = {}
    rows.forEach(r => { stats[r.status] = r.cnt })
    return c.json({ success: true, data: stats })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id', (c) => {
  try {
    const db = getSqlite()
    const id = c.req.param('id')
    const req = db.prepare(`SELECT r.*,i.name as institute_name,l.name as location_name,m.name as module_name FROM requirements r LEFT JOIN institutes i ON r.institute_id=i.id LEFT JOIN locations l ON r.location_id=l.id LEFT JOIN modules m ON r.module_id=m.id WHERE r.id=? AND r.deleted_at IS NULL`).get(id)
    if (!req) return c.json({ success: false, error: 'Not found' }, 404)
    const estimation = db.prepare(`SELECT * FROM requirement_estimations WHERE requirement_id=?`).get(id)
    const approval = db.prepare(`SELECT * FROM requirement_approvals WHERE requirement_id=?`).get(id)
    const history = db.prepare(`SELECT * FROM requirement_history WHERE requirement_id=? ORDER BY changed_at ASC`).all(id)
    const sprints = db.prepare(`SELECT * FROM sprints WHERE requirement_id=? ORDER BY created_at DESC`).all(id)
    return c.json({ success: true, data: { ...(req as object), estimation: estimation ?? null, approval: approval ?? null, history, sprints } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id/history', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM requirement_history WHERE requirement_id=? ORDER BY changed_at ASC`).all(c.req.param('id')) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/:id/uat', (c) => {
  try {
    return c.json({ success: true, data: getSqlite().prepare(`SELECT * FROM uat_records WHERE requirement_id=? ORDER BY created_at DESC`).all(c.req.param('id')) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const user = getUser(c)
    const db = getSqlite()
    const year = new Date().getFullYear()
    const cnt = (db.prepare(`SELECT COUNT(*) as cnt FROM requirements WHERE req_ref LIKE ?`).get(`REQ-${year}-%`) as { cnt: number }).cnt
    const ref = `REQ-${year}-${String(cnt + 1).padStart(4, '0')}`
    const r = db.prepare(`INSERT INTO requirements (req_ref,date_identified,institute_id,location_id,dept_id,module_id,title,description,business_need,user_impact,business_impact,priority,source,requested_by,portfolio_manager,status,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(ref,data.dateIdentified??today(),data.instituteId,data.locationId??null,data.deptId??null,data.moduleId??null,data.title,data.description,data.businessNeed??null,data.userImpact??null,data.businessImpact??null,data.priority??'medium',data.source??'direct',data.requestedBy??null,user.fullName??null,data.status??'identified',data.remarks??null)
    const id = Number(r.lastInsertRowid)
    db.prepare(`INSERT INTO requirement_history (requirement_id,to_status,changed_by,notes) VALUES (?,?,?,?)`).run(id,'identified',user.fullName??'System','Requirement created')
    writeAuditLog({ userId: user.id, module: 'requirements', recordId: id, action: 'create', newValue: { ref } })
    return c.json({ success: true, data: { id, reqRef: ref } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.put('/:id', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`UPDATE requirements SET title=?,description=?,business_need=?,user_impact=?,business_impact=?,priority=?,source=?,requested_by=?,product_owner=?,remarks=?,updated_at=datetime('now') WHERE id=?`)
      .run(data.title,data.description,data.businessNeed??null,data.userImpact??null,data.businessImpact??null,data.priority??'medium',data.source??'direct',data.requestedBy??null,data.productOwner??null,data.remarks??null,c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/advance-status', async (c) => {
  try {
    const { toStatus, notes } = await c.req.json()
    const id = c.req.param('id')
    const user = getUser(c)
    const db = getSqlite()
    const row = db.prepare(`SELECT status FROM requirements WHERE id=?`).get(id) as { status: string } | undefined
    if (!row) return c.json({ success: false, error: 'Not found' }, 404)
    const allowed = VALID_TRANSITIONS[row.status] ?? []
    if (!allowed.includes(toStatus)) return c.json({ success: false, error: `Cannot move from '${row.status}' to '${toStatus}'` })
    db.prepare(`UPDATE requirements SET status=?,updated_at=datetime('now') WHERE id=?`).run(toStatus, id)
    db.prepare(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`).run(id,row.status,toStatus,user.fullName??'System',notes??null)
    writeAuditLog({ userId: user.id, module: 'requirements', recordId: Number(id), action: 'status_change', oldValue: row.status, newValue: toStatus })
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/estimation', async (c) => {
  try {
    const data = await c.req.json()
    const reqId = c.req.param('id')
    const user = getUser(c)
    const db = getSqlite()
    const exists = db.prepare(`SELECT id FROM requirement_estimations WHERE requirement_id=?`).get(reqId)
    if (exists) {
      db.prepare(`UPDATE requirement_estimations SET technical_complexity=?,dev_effort_days=?,qa_effort_days=?,dependencies=?,estimated_sprint=?,estimated_release_date=?,estimator=?,estimation_date=?,remarks=? WHERE requirement_id=?`)
        .run(data.technicalComplexity,data.devEffortDays??null,data.qaEffortDays??null,data.dependencies??null,data.estimatedSprint??null,data.estimatedReleaseDate??null,data.estimator??null,data.estimationDate??today(),data.remarks??null,reqId)
    } else {
      db.prepare(`INSERT INTO requirement_estimations (requirement_id,technical_complexity,dev_effort_days,qa_effort_days,dependencies,estimated_sprint,estimated_release_date,estimator,estimation_date,remarks) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(reqId,data.technicalComplexity,data.devEffortDays??null,data.qaEffortDays??null,data.dependencies??null,data.estimatedSprint??null,data.estimatedReleaseDate??null,data.estimator??null,data.estimationDate??today(),data.remarks??null)
    }
    const cur = db.prepare(`SELECT status FROM requirements WHERE id=?`).get(reqId) as { status: string }
    if (cur?.status === 'estimation_pending') {
      db.prepare(`UPDATE requirements SET status='estimated',updated_at=datetime('now') WHERE id=?`).run(reqId)
      db.prepare(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`).run(reqId,'estimation_pending','estimated',user.fullName??'System','Estimation completed')
    }
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/approval', async (c) => {
  try {
    const data = await c.req.json()
    const reqId = c.req.param('id')
    const user = getUser(c)
    const db = getSqlite()
    const exists = db.prepare(`SELECT id FROM requirement_approvals WHERE requirement_id=?`).get(reqId)
    if (exists) {
      db.prepare(`UPDATE requirement_approvals SET priority=?,business_justification=?,estimated_effort=?,impact=?,dependency=?,approval_status=?,approved_by=?,approval_date=?,comments=? WHERE requirement_id=?`)
        .run(data.priority,data.businessJustification??null,data.estimatedEffort??null,data.impact??null,data.dependency??null,data.approvalStatus??'pending',data.approvedBy??null,data.approvalDate??null,data.comments??null,reqId)
    } else {
      db.prepare(`INSERT INTO requirement_approvals (requirement_id,priority,business_justification,estimated_effort,impact,dependency,approval_status,approved_by,approval_date,comments) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(reqId,data.priority,data.businessJustification??null,data.estimatedEffort??null,data.impact??null,data.dependency??null,data.approvalStatus??'pending',data.approvedBy??null,data.approvalDate??null,data.comments??null)
    }
    if (data.approvalStatus === 'approved') {
      db.prepare(`UPDATE requirements SET status='approved',updated_at=datetime('now') WHERE id=?`).run(reqId)
      db.prepare(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`).run(reqId,'approval_pending','approved',user.fullName??'System',`Approved by: ${data.approvedBy}`)
    } else if (data.approvalStatus === 'rejected') {
      db.prepare(`UPDATE requirements SET status='rejected',updated_at=datetime('now') WHERE id=?`).run(reqId)
      db.prepare(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`).run(reqId,'approval_pending','rejected',user.fullName??'System',data.comments??null)
    } else if (data.approvalStatus === 'deferred') {
      db.prepare(`UPDATE requirements SET status='deferred',updated_at=datetime('now') WHERE id=?`).run(reqId)
      db.prepare(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`).run(reqId,'approval_pending','deferred',user.fullName??'System',data.comments??null)
    }
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/:id/sprint', async (c) => {
  try {
    const data = await c.req.json()
    const reqId = c.req.param('id')
    const db = getSqlite()
    db.prepare(`INSERT INTO sprints (name,requirement_id,dev_team,start_date,planned_completion,status,developer,qa_person) VALUES (?,?,?,?,?,?,?,?)`)
      .run(data.name,reqId,data.devTeam??null,data.startDate??null,data.plannedCompletion??null,data.status??'planned',data.developer??null,data.qaPerson??null)
    db.prepare(`UPDATE requirements SET status='sprint_planned',updated_at=datetime('now') WHERE id=? AND status='approved'`).run(reqId)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.post('/uat-record', async (c) => {
  try {
    const data = await c.req.json()
    getSqlite().prepare(`INSERT INTO uat_records (requirement_id,sprint_id,test_case,test_date,tester,result,defect_description,client_confirmation,notes) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(data.requirementId,data.sprintId??null,data.testCase,data.testDate??today(),data.tester??null,data.result??'not_tested',data.defectDescription??null,data.clientConfirmation?1:0,data.notes??null)
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`UPDATE requirements SET deleted_at=datetime('now') WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
