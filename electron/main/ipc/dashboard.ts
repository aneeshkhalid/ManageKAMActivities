import { ipcMain } from 'electron'
import { getSqlJsDb, saveDatabase } from '../db'
import { getCurrentSession } from '../services/auth.service'
import { writeAuditLog } from '../services/audit.service'

function toObjects(r: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (!r.length) return []
  const { columns, values } = r[0]
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}
function today() { return new Date().toISOString().split('T')[0] }

export function registerDashboardHandlers(): void {

  ipcMain.handle('dashboard:getKPIs', (_e, _filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const t = today()
      const q = (sql: string, params?: unknown[]) => {
        const r = db.exec(sql, params)
        return r[0]?.values[0][0] as number ?? 0
      }
      return {
        success: true, data: {
          totalInstitutes: q(`SELECT COUNT(*) FROM institutes WHERE deleted_at IS NULL`),
          institutesVisited: q(`SELECT COUNT(DISTINCT institute_id) FROM institute_visits`),
          locationsCovered: q(`SELECT COUNT(DISTINCT location_id) FROM institute_visits WHERE location_id IS NOT NULL`),
          modulesAudited: q(`SELECT COUNT(DISTINCT module_id) FROM audits`),
          benchmarkAdoptionPct: (() => {
            const r = db.exec(`SELECT AVG(adoption_pct) FROM module_adoption WHERE is_actively_used = 1`)
            return Math.round((r[0]?.values[0][0] as number) ?? 0)
          })(),
          trainingSessions: q(`SELECT COUNT(*) FROM training_sessions WHERE status = 'Completed'`),
          totalParticipantsTrained: q(`SELECT COALESCE(SUM(actual_attendance),0) FROM training_sessions WHERE status='Completed'`),
          openIssues: q(`SELECT COUNT(*) FROM issues WHERE status IN ('open','in_progress')`),
          openRequirements: q(`SELECT COUNT(*) FROM requirements WHERE status NOT IN ('released','closed','rejected') AND deleted_at IS NULL`),
          requirementsAwaitingApproval: q(`SELECT COUNT(*) FROM requirements WHERE status='approval_pending' AND deleted_at IS NULL`),
          activeImplementations: q(`SELECT COUNT(*) FROM implementations WHERE status IN ('planning','in_progress','blocked','uat')`),
          pendingModulesCount: q(`SELECT COUNT(*) FROM pending_modules WHERE status='Pending'`),
          openActions: q(`SELECT COUNT(*) FROM actions WHERE status IN ('open','in_progress')`),
          overdueActions: q(`SELECT COUNT(*) FROM actions WHERE due_date < ? AND status IN ('open','in_progress')`, [t]),
          openRisks: q(`SELECT COUNT(*) FROM risks WHERE status='open'`),
          criticalRisks: q(`SELECT COUNT(*) FROM risks WHERE risk_level='critical' AND status='open'`),
          visitsSinceStart: q(`SELECT COUNT(*) FROM institute_visits WHERE status='Completed'`),
          openPainAreas: q(`SELECT COUNT(*) FROM pain_areas WHERE status='Open'`),
        }
      }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getAttentionItems', () => {
    try {
      const db = getSqlJsDb()
      const t = today()
      const items: unknown[] = []

      // Overdue actions
      const overdue = toObjects(db.exec(`SELECT a.*, i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.due_date < ? AND a.status IN ('open','in_progress') ORDER BY a.due_date LIMIT 10`, [t]))
      overdue.forEach(a => items.push({ type: 'overdue_action', severity: 'critical', title: `Overdue: ${a.description}`, detail: `Due: ${a.due_date} | Owner: ${a.owner}`, id: a.id, institute: a.institute_name }))

      // Approval pending requirements
      const approvals = toObjects(db.exec(`SELECT r.*, i.name as institute_name FROM requirements r LEFT JOIN institutes i ON r.institute_id=i.id WHERE r.status='approval_pending' AND r.deleted_at IS NULL LIMIT 10`))
      approvals.forEach(r => items.push({ type: 'approval_pending', severity: 'high', title: `Approval Needed: ${r.title}`, detail: `Ref: ${r.req_ref} | Priority: ${r.priority}`, id: r.id, institute: r.institute_name }))

      // Critical risks
      const risks = toObjects(db.exec(`SELECT * FROM risks WHERE risk_level='critical' AND status='open' LIMIT 5`))
      risks.forEach(r => items.push({ type: 'critical_risk', severity: 'critical', title: `Critical Risk: ${r.description}`, detail: `Score: ${r.risk_score} | Owner: ${r.owner}`, id: r.id }))

      // Delayed implementations
      const implDelayed = toObjects(db.exec(`SELECT im.*, i.name as institute_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id WHERE im.target_date < ? AND im.status NOT IN ('completed','live') LIMIT 5`, [t]))
      implDelayed.forEach(im => items.push({ type: 'delayed_impl', severity: 'high', title: `Delayed: ${im.project_name}`, detail: `Target: ${im.target_date} | Progress: ${im.progress_pct}%`, id: im.id, institute: im.institute_name }))

      return { success: true, data: items }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getMyWorkToday', () => {
    try {
      const db = getSqlJsDb()
      const t = today()
      const visits = toObjects(db.exec(`SELECT v.*, i.name as institute_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id WHERE v.visit_date=?`, [t]))
      const meetings = toObjects(db.exec(`SELECT * FROM leadership_meetings WHERE meeting_date=?`, [t]))
      const actions = toObjects(db.exec(`SELECT a.*, i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.due_date=? AND a.status IN ('open','in_progress')`, [t]))
      const trainings = toObjects(db.exec(`SELECT ts.*, i.name as institute_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id WHERE ts.training_date=?`, [t]))
      return { success: true, data: { visits, meetings, actions, trainings } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getInstituteEngagement', () => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`
        SELECT i.id, i.name, i.code,
          (SELECT COUNT(*) FROM institute_visits v WHERE v.institute_id=i.id) as visits,
          (SELECT COUNT(*) FROM training_sessions t WHERE t.institute_id=i.id) as trainings,
          (SELECT COUNT(*) FROM issues iss WHERE iss.institute_id=i.id) as issues,
          (SELECT COUNT(*) FROM requirements req WHERE req.institute_id=i.id AND req.deleted_at IS NULL) as requirements,
          (SELECT COUNT(*) FROM implementations im WHERE im.institute_id=i.id) as implementations
        FROM institutes i WHERE i.deleted_at IS NULL ORDER BY i.name`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getBenchmarkAdoption', () => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`
        SELECT i.id, i.name, i.code,
          ROUND(AVG(ma.adoption_pct),1) as avg_adoption,
          COUNT(CASE WHEN ma.is_actively_used=1 THEN 1 END) as active_modules,
          COUNT(ma.id) as total_modules
        FROM institutes i
        LEFT JOIN module_adoption ma ON ma.institute_id=i.id
        WHERE i.deleted_at IS NULL
        GROUP BY i.id ORDER BY avg_adoption DESC`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getRequirementPipeline', () => {
    try {
      const db = getSqlJsDb()
      const stages = ['identified','documented','under_review','estimation_pending','estimated','approval_pending','approved','rejected','deferred','sprint_planned','development','qa','uat','released','closed']
      const r = db.exec(`SELECT status, COUNT(*) as cnt FROM requirements WHERE deleted_at IS NULL GROUP BY status`)
      const byStatus: Record<string, number> = {}
      if (r.length) r[0].values.forEach(row => { byStatus[row[0] as string] = row[1] as number })
      return { success: true, data: stages.map(s => ({ status: s, count: byStatus[s] ?? 0 })) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getImplementationProgress', () => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`SELECT im.*, i.name as institute_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id ORDER BY im.progress_pct DESC`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getMonthlyTrend', () => {
    try {
      const db = getSqlJsDb()
      const months: { month: string; label: string }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i)
        months.push({ month: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label: d.toLocaleString('default',{month:'short',year:'2-digit'}) })
      }
      const data = months.map(({ month, label }) => {
        const q = (sql: string) => db.exec(sql, [`${month}-%`])[0]?.values[0][0] as number ?? 0
        return {
          month: label,
          visits: q(`SELECT COUNT(*) FROM institute_visits WHERE visit_date LIKE ?`),
          trainings: q(`SELECT COUNT(*) FROM training_sessions WHERE training_date LIKE ?`),
          issues: q(`SELECT COUNT(*) FROM issues WHERE issue_date LIKE ?`),
          requirements: q(`SELECT COUNT(*) FROM requirements WHERE date_identified LIKE ? AND deleted_at IS NULL`),
          actionsClosed: q(`SELECT COUNT(*) FROM actions WHERE completion_date LIKE ? AND status='completed'`),
        }
      })
      return { success: true, data }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getCalendarEvents', (_e, { from, to }: { from: string; to: string }) => {
    try {
      const db = getSqlJsDb()
      const events: unknown[] = []
      toObjects(db.exec(`SELECT v.visit_date as date, 'visit' as type, 'Visit: '||i.name as title, v.status as status FROM institute_visits v JOIN institutes i ON v.institute_id=i.id WHERE v.visit_date BETWEEN ? AND ?`, [from, to]))
        .forEach(e => events.push(e))
      toObjects(db.exec(`SELECT t.training_date as date, 'training' as type, 'Training: '||t.topic as title, t.status as status FROM training_sessions t WHERE t.training_date BETWEEN ? AND ?`, [from, to]))
        .forEach(e => events.push(e))
      toObjects(db.exec(`SELECT m.meeting_date as date, 'meeting' as type, 'Meeting: '||m.topic as title, m.status as status FROM leadership_meetings m WHERE m.meeting_date BETWEEN ? AND ?`, [from, to]))
        .forEach(e => events.push(e))
      toObjects(db.exec(`SELECT a.due_date as date, 'action' as type, 'Action Due: '||a.description as title, a.status as status FROM actions a WHERE a.due_date BETWEEN ? AND ? AND a.status IN ('open','in_progress')`, [from, to]))
        .forEach(e => events.push(e))
      return { success: true, data: events }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getModuleAdoptionStats', () => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`
        SELECT m.id, m.name, m.code, m.category,
          COUNT(ma.id) as total_institutes,
          COUNT(CASE WHEN ma.is_actively_used=1 THEN 1 END) as active_institutes,
          ROUND(AVG(ma.adoption_pct),1) as avg_adoption
        FROM modules m
        LEFT JOIN module_adoption ma ON ma.module_id=m.id
        WHERE m.status='Active'
        GROUP BY m.id ORDER BY avg_adoption DESC`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('dashboard:getTrainingSummary', () => {
    try {
      const db = getSqlJsDb()
      const total = db.exec(`SELECT COUNT(*) FROM training_sessions WHERE status='Completed'`)[0]?.values[0][0]
      const participants = db.exec(`SELECT COALESCE(SUM(actual_attendance),0) FROM training_sessions WHERE status='Completed'`)[0]?.values[0][0]
      const institutes = db.exec(`SELECT COUNT(DISTINCT institute_id) FROM training_sessions WHERE status='Completed'`)[0]?.values[0][0]
      const modules = db.exec(`SELECT COUNT(DISTINCT module_id) FROM training_sessions WHERE status='Completed' AND module_id IS NOT NULL`)[0]?.values[0][0]
      const hours = db.exec(`SELECT ROUND(COALESCE(SUM(duration_hours),0),1) FROM training_sessions WHERE status='Completed'`)[0]?.values[0][0]
      return { success: true, data: { totalSessions: total, totalParticipants: participants, institutesCovered: institutes, modulesCovered: modules, totalHours: hours } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getAll', () => {
    try {
      const r = getSqlJsDb().exec(`SELECT key, value FROM settings ORDER BY key`)
      const data: Record<string, string> = {}
      if (r.length) r[0].values.forEach(row => { data[row[0] as string] = row[1] as string })
      return { success: true, data }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('settings:get', (_e, key: string) => {
    try {
      const r = getSqlJsDb().exec(`SELECT value FROM settings WHERE key=?`, [key])
      return { success: true, data: r[0]?.values[0][0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('settings:set', (_e, { key, value }: { key: string; value: unknown }) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,datetime('now'))`, [key, JSON.stringify(value)])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('settings:setMany', (_e, settings: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      for (const [key, value] of Object.entries(settings)) {
        db.run(`INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,datetime('now'))`, [key, typeof value === 'string' ? value : JSON.stringify(value)])
      }
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}

export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:getAll', () => {
    try {
      const r = getSqlJsDb().exec(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('notifications:getUnread', () => {
    try {
      const r = getSqlJsDb().exec(`SELECT * FROM notifications WHERE is_read=0 ORDER BY created_at DESC LIMIT 50`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('notifications:markRead', (_e, id: number) => {
    try {
      getSqlJsDb().run(`UPDATE notifications SET is_read=1 WHERE id=?`, [id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('notifications:markAllRead', () => {
    try {
      getSqlJsDb().run(`UPDATE notifications SET is_read=1 WHERE is_read=0`)
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}

export function registerAuditLogHandlers(): void {
  ipcMain.handle('auditLogs:getAll', (_e, filters?: { module?: string; action?: string }) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT al.*, u.full_name as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id=u.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.module) { sql += ` AND al.module=?`; params.push(filters.module) }
      if (filters?.action) { sql += ` AND al.action=?`; params.push(filters.action) }
      sql += ` ORDER BY al.created_at DESC LIMIT 500`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}
