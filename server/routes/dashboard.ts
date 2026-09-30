import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'

const app = new Hono()
app.use('*', requireAuth)
function today() { return new Date().toISOString().split('T')[0] }

app.get('/kpis', (c) => {
  try {
    const db = getSqlite()
    const t = today()
    const q = (sql: string, ...params: unknown[]) => (db.prepare(sql).get(...params) as { v: number }).v ?? 0
    const qc = (sql: string, ...params: unknown[]) => (db.prepare(sql).get(...params) as { cnt: number }).cnt ?? 0
    return c.json({
      success: true,
      data: {
        totalInstitutes: (db.prepare(`SELECT COUNT(*) as cnt FROM institutes WHERE deleted_at IS NULL`).get() as { cnt: number }).cnt,
        institutesVisited: (db.prepare(`SELECT COUNT(DISTINCT institute_id) as cnt FROM institute_visits`).get() as { cnt: number }).cnt,
        locationsCovered: (db.prepare(`SELECT COUNT(DISTINCT location_id) as cnt FROM institute_visits WHERE location_id IS NOT NULL`).get() as { cnt: number }).cnt,
        modulesAudited: (db.prepare(`SELECT COUNT(DISTINCT module_id) as cnt FROM audits`).get() as { cnt: number }).cnt,
        benchmarkAdoptionPct: Math.round((db.prepare(`SELECT AVG(adoption_pct) as v FROM module_adoption WHERE is_actively_used=1`).get() as { v: number | null }).v ?? 0),
        trainingSessions: (db.prepare(`SELECT COUNT(*) as cnt FROM training_sessions WHERE status='Completed'`).get() as { cnt: number }).cnt,
        totalParticipantsTrained: (db.prepare(`SELECT COALESCE(SUM(actual_attendance),0) as cnt FROM training_sessions WHERE status='Completed'`).get() as { cnt: number }).cnt,
        openIssues: (db.prepare(`SELECT COUNT(*) as cnt FROM issues WHERE status IN ('open','in_progress')`).get() as { cnt: number }).cnt,
        openRequirements: (db.prepare(`SELECT COUNT(*) as cnt FROM requirements WHERE status NOT IN ('released','closed','rejected') AND deleted_at IS NULL`).get() as { cnt: number }).cnt,
        requirementsAwaitingApproval: (db.prepare(`SELECT COUNT(*) as cnt FROM requirements WHERE status='approval_pending' AND deleted_at IS NULL`).get() as { cnt: number }).cnt,
        activeImplementations: (db.prepare(`SELECT COUNT(*) as cnt FROM implementations WHERE status IN ('planning','in_progress','blocked','uat')`).get() as { cnt: number }).cnt,
        pendingModulesCount: (db.prepare(`SELECT COUNT(*) as cnt FROM pending_modules WHERE status='Pending'`).get() as { cnt: number }).cnt,
        openActions: (db.prepare(`SELECT COUNT(*) as cnt FROM actions WHERE status IN ('open','in_progress')`).get() as { cnt: number }).cnt,
        overdueActions: (db.prepare(`SELECT COUNT(*) as cnt FROM actions WHERE due_date < ? AND status IN ('open','in_progress')`).get(t) as { cnt: number }).cnt,
        openRisks: (db.prepare(`SELECT COUNT(*) as cnt FROM risks WHERE status='open'`).get() as { cnt: number }).cnt,
        criticalRisks: (db.prepare(`SELECT COUNT(*) as cnt FROM risks WHERE risk_level='critical' AND status='open'`).get() as { cnt: number }).cnt,
        visitsSinceStart: (db.prepare(`SELECT COUNT(*) as cnt FROM institute_visits WHERE status='Completed'`).get() as { cnt: number }).cnt,
        openPainAreas: (db.prepare(`SELECT COUNT(*) as cnt FROM pain_areas WHERE status='Open'`).get() as { cnt: number }).cnt,
      }
    })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/attention-items', (c) => {
  try {
    const db = getSqlite()
    const t = today()
    const items: unknown[] = []
    ;(db.prepare(`SELECT a.*,i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.due_date < ? AND a.status IN ('open','in_progress') ORDER BY a.due_date LIMIT 10`).all(t) as Record<string, unknown>[]).forEach(a => items.push({ type: 'overdue_action', severity: 'critical', title: `Overdue: ${a.description}`, detail: `Due: ${a.due_date} | Owner: ${a.owner}`, id: a.id, institute: a.institute_name }))
    ;(db.prepare(`SELECT r.*,i.name as institute_name FROM requirements r LEFT JOIN institutes i ON r.institute_id=i.id WHERE r.status='approval_pending' AND r.deleted_at IS NULL LIMIT 10`).all() as Record<string, unknown>[]).forEach(r => items.push({ type: 'approval_pending', severity: 'high', title: `Approval Needed: ${r.title}`, detail: `Ref: ${r.req_ref} | Priority: ${r.priority}`, id: r.id, institute: r.institute_name }))
    ;(db.prepare(`SELECT * FROM risks WHERE risk_level='critical' AND status='open' LIMIT 5`).all() as Record<string, unknown>[]).forEach(r => items.push({ type: 'critical_risk', severity: 'critical', title: `Critical Risk: ${r.description}`, detail: `Score: ${r.risk_score} | Owner: ${r.owner}`, id: r.id }))
    ;(db.prepare(`SELECT im.*,i.name as institute_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id WHERE im.target_date < ? AND im.status NOT IN ('completed','live') LIMIT 5`).all(t) as Record<string, unknown>[]).forEach(im => items.push({ type: 'delayed_impl', severity: 'high', title: `Delayed: ${im.project_name}`, detail: `Target: ${im.target_date} | Progress: ${im.progress_pct}%`, id: im.id, institute: im.institute_name }))
    return c.json({ success: true, data: items })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/my-work-today', (c) => {
  try {
    const db = getSqlite()
    const t = today()
    return c.json({
      success: true,
      data: {
        visits: db.prepare(`SELECT v.*,i.name as institute_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id WHERE v.visit_date=?`).all(t),
        meetings: db.prepare(`SELECT * FROM leadership_meetings WHERE meeting_date=?`).all(t),
        actions: db.prepare(`SELECT a.*,i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.due_date=? AND a.status IN ('open','in_progress')`).all(t),
        trainings: db.prepare(`SELECT ts.*,i.name as institute_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id WHERE ts.training_date=?`).all(t),
      }
    })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/institute-engagement', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT i.id,i.name,i.code,(SELECT COUNT(*) FROM institute_visits v WHERE v.institute_id=i.id) as visits,(SELECT COUNT(*) FROM training_sessions t WHERE t.institute_id=i.id) as trainings,(SELECT COUNT(*) FROM issues iss WHERE iss.institute_id=i.id) as issues,(SELECT COUNT(*) FROM requirements req WHERE req.institute_id=i.id AND req.deleted_at IS NULL) as requirements,(SELECT COUNT(*) FROM implementations im WHERE im.institute_id=i.id) as implementations FROM institutes i WHERE i.deleted_at IS NULL ORDER BY i.name`).all()
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/benchmark-adoption', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT i.id,i.name,i.code,ROUND(AVG(ma.adoption_pct),1) as avg_adoption,COUNT(CASE WHEN ma.is_actively_used=1 THEN 1 END) as active_modules,COUNT(ma.id) as total_modules FROM institutes i LEFT JOIN module_adoption ma ON ma.institute_id=i.id WHERE i.deleted_at IS NULL GROUP BY i.id ORDER BY avg_adoption DESC`).all()
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/requirement-pipeline', (c) => {
  try {
    const db = getSqlite()
    const stages = ['identified','documented','under_review','estimation_pending','estimated','approval_pending','approved','rejected','deferred','sprint_planned','development','qa','uat','released','closed']
    const rows = db.prepare(`SELECT status,COUNT(*) as cnt FROM requirements WHERE deleted_at IS NULL GROUP BY status`).all() as { status: string; cnt: number }[]
    const byStatus: Record<string, number> = {}
    rows.forEach(r => { byStatus[r.status] = r.cnt })
    return c.json({ success: true, data: stages.map(s => ({ status: s, count: byStatus[s] ?? 0 })) })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/implementation-progress', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT im.*,i.name as institute_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id ORDER BY im.progress_pct DESC`).all()
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/module-adoption-stats', (c) => {
  try {
    const rows = getSqlite().prepare(`SELECT m.id,m.name,m.code,m.category,COUNT(ma.id) as total_institutes,COUNT(CASE WHEN ma.is_actively_used=1 THEN 1 END) as active_institutes,ROUND(AVG(ma.adoption_pct),1) as avg_adoption FROM modules m LEFT JOIN module_adoption ma ON ma.module_id=m.id WHERE m.status='Active' GROUP BY m.id ORDER BY avg_adoption DESC`).all()
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/training-summary', (c) => {
  try {
    const db = getSqlite()
    return c.json({
      success: true,
      data: {
        totalSessions: (db.prepare(`SELECT COUNT(*) as cnt FROM training_sessions WHERE status='Completed'`).get() as { cnt: number }).cnt,
        totalParticipants: (db.prepare(`SELECT COALESCE(SUM(actual_attendance),0) as cnt FROM training_sessions WHERE status='Completed'`).get() as { cnt: number }).cnt,
        institutesCovered: (db.prepare(`SELECT COUNT(DISTINCT institute_id) as cnt FROM training_sessions WHERE status='Completed'`).get() as { cnt: number }).cnt,
        modulesCovered: (db.prepare(`SELECT COUNT(DISTINCT module_id) as cnt FROM training_sessions WHERE status='Completed' AND module_id IS NOT NULL`).get() as { cnt: number }).cnt,
        totalHours: (db.prepare(`SELECT ROUND(COALESCE(SUM(duration_hours),0),1) as v FROM training_sessions WHERE status='Completed'`).get() as { v: number }).v,
      }
    })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/monthly-trend', (c) => {
  try {
    const db = getSqlite()
    const months: { month: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      months.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('default', { month: 'short', year: '2-digit' }) })
    }
    const data = months.map(({ month, label }) => ({
      month: label,
      visits: (db.prepare(`SELECT COUNT(*) as cnt FROM institute_visits WHERE visit_date LIKE ?`).get(`${month}-%`) as { cnt: number }).cnt,
      trainings: (db.prepare(`SELECT COUNT(*) as cnt FROM training_sessions WHERE training_date LIKE ?`).get(`${month}-%`) as { cnt: number }).cnt,
      issues: (db.prepare(`SELECT COUNT(*) as cnt FROM issues WHERE issue_date LIKE ?`).get(`${month}-%`) as { cnt: number }).cnt,
      requirements: (db.prepare(`SELECT COUNT(*) as cnt FROM requirements WHERE date_identified LIKE ? AND deleted_at IS NULL`).get(`${month}-%`) as { cnt: number }).cnt,
      actionsClosed: (db.prepare(`SELECT COUNT(*) as cnt FROM actions WHERE completion_date LIKE ? AND status='completed'`).get(`${month}-%`) as { cnt: number }).cnt,
    }))
    return c.json({ success: true, data })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/calendar-events', (c) => {
  try {
    const db = getSqlite()
    const from = c.req.query('from') ?? today()
    const to = c.req.query('to') ?? today()
    const events: unknown[] = []
    ;(db.prepare(`SELECT v.visit_date as date,'visit' as type,'Visit: '||i.name as title,v.status FROM institute_visits v JOIN institutes i ON v.institute_id=i.id WHERE v.visit_date BETWEEN ? AND ?`).all(from, to)).forEach(e => events.push(e))
    ;(db.prepare(`SELECT t.training_date as date,'training' as type,'Training: '||t.topic as title,t.status FROM training_sessions t WHERE t.training_date BETWEEN ? AND ?`).all(from, to)).forEach(e => events.push(e))
    ;(db.prepare(`SELECT m.meeting_date as date,'meeting' as type,'Meeting: '||m.topic as title,m.status FROM leadership_meetings m WHERE m.meeting_date BETWEEN ? AND ?`).all(from, to)).forEach(e => events.push(e))
    ;(db.prepare(`SELECT a.due_date as date,'action' as type,'Action Due: '||a.description as title,a.status FROM actions a WHERE a.due_date BETWEEN ? AND ? AND a.status IN ('open','in_progress')`).all(from, to)).forEach(e => events.push(e))
    return c.json({ success: true, data: events })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
