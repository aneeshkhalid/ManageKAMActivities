import { ipcMain, app, shell, dialog, BrowserWindow } from 'electron'
import { getSqlJsDb, saveDatabase } from '../db'
import { getCurrentSession } from '../services/auth.service'
import { writeAuditLog } from '../services/audit.service'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync, readdirSync, writeFileSync, readFileSync } from 'fs'
import bcrypt from 'bcryptjs'

function toObjects(r: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (!r.length) return []
  const { columns, values } = r[0]
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}
function today() { return new Date().toISOString().split('T')[0] }

export function registerUserHandlers(): void {
  ipcMain.handle('users:getAll', () => {
    try {
      const r = getSqlJsDb().exec(`SELECT id,username,full_name,email,role,status,last_login,created_at FROM users ORDER BY full_name`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('users:getById', (_e, id: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT id,username,full_name,email,role,status,last_login,created_at FROM users WHERE id=?`, [id])
      return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('users:create', async (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const hash = await bcrypt.hash(data.password as string, 12)
      db.run(`INSERT INTO users (username,password_hash,full_name,email,role,status) VALUES (?,?,?,?,?,?)`,
        [data.username, hash, data.fullName, data.email ?? null, data.role ?? 'user', 'active'])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase()
      return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('users:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      db.run(`UPDATE users SET full_name=?,email=?,role=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [data.fullName, data.email ?? null, data.role ?? 'user', data.status ?? 'active', id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('users:delete', (_e, id: number) => {
    try {
      getSqlJsDb().run(`UPDATE users SET status='inactive' WHERE id=?`, [id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('users:resetPassword', async (_e, { id, newPassword }: { id: number; newPassword: string }) => {
    try {
      const hash = await bcrypt.hash(newPassword, 12)
      getSqlJsDb().run(`UPDATE users SET password_hash=?,updated_at=datetime('now') WHERE id=?`, [hash, id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}

export function registerMiscHandlers(): void {

  // Issues
  ipcMain.handle('issues:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT iss.*, i.name as institute_name, m.name as module_name FROM issues iss LEFT JOIN institutes i ON iss.institute_id=i.id LEFT JOIN modules m ON iss.module_id=m.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.status) { sql += ` AND iss.status=?`; params.push(filters.status) }
      if (filters?.priority) { sql += ` AND iss.priority=?`; params.push(filters.priority) }
      if (filters?.instituteId) { sql += ` AND iss.institute_id=?`; params.push(filters.instituteId) }
      if (filters?.moduleId) { sql += ` AND iss.module_id=?`; params.push(filters.moduleId) }
      sql += ` ORDER BY iss.created_at DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('issues:getById', (_e, id: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT iss.*, i.name as institute_name FROM issues iss LEFT JOIN institutes i ON iss.institute_id=i.id WHERE iss.id=?`, [id])
      return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('issues:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const year = new Date().getFullYear()
      const cnt = (db.exec(`SELECT COUNT(*) FROM issues WHERE issue_ref LIKE ?`, [`ISS-${year}-%`])[0]?.values[0][0] as number ?? 0) + 1
      const ref = `ISS-${year}-${String(cnt).padStart(4, '0')}`
      db.run(`INSERT INTO issues (issue_ref,issue_date,institute_id,location_id,module_id,description,category,priority,impact,root_cause,workaround,assigned_to,target_date,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, data.issueDate ?? today(), data.instituteId, data.locationId ?? null, data.moduleId ?? null,
         data.description, data.category ?? 'functional', data.priority ?? 'medium',
         data.impact ?? null, data.rootCause ?? null, data.workaround ?? null,
         data.assignedTo ?? null, data.targetDate ?? null, 'open'])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase()
      return { success: true, data: { id, issueRef: ref } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('issues:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      db.run(`UPDATE issues SET description=?,category=?,priority=?,impact=?,root_cause=?,workaround=?,assigned_to=?,target_date=?,updated_at=datetime('now') WHERE id=?`,
        [data.description, data.category ?? 'functional', data.priority ?? 'medium', data.impact ?? null, data.rootCause ?? null, data.workaround ?? null, data.assignedTo ?? null, data.targetDate ?? null, id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('issues:changeStatus', (_e, { id, status, resolution }: { id: number; status: string; resolution?: string }) => {
    try {
      const db = getSqlJsDb()
      const closedDate = ['resolved', 'closed'].includes(status) ? today() : null
      db.run(`UPDATE issues SET status=?,resolution=?,closed_date=?,updated_at=datetime('now') WHERE id=?`,
        [status, resolution ?? null, closedDate, id])
      saveDatabase()
      writeAuditLog({ userId: getCurrentSession()?.id, module: 'issues', recordId: id, action: 'status_change', newValue: status })
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('issues:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM issues WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Visits
  ipcMain.handle('visits:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT v.*, i.name as institute_name, l.name as location_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id LEFT JOIN locations l ON v.location_id=l.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.instituteId) { sql += ` AND v.institute_id=?`; params.push(filters.instituteId) }
      if (filters?.status) { sql += ` AND v.status=?`; params.push(filters.status) }
      sql += ` ORDER BY v.visit_date DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('visits:getById', (_e, id: number) => {
    try { const r = getSqlJsDb().exec(`SELECT v.*, i.name as institute_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id WHERE v.id=?`, [id]); return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('visits:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO institute_visits (visit_date,institute_id,location_id,purpose,participants,modules_discussed,findings,pain_areas_noted,training_required,next_visit_date,remarks,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.visitDate ?? today(), data.instituteId, data.locationId ?? null, data.purpose, data.participants ?? null, data.modulesDiscussed ?? null, data.findings ?? null, data.painAreasNoted ?? null, data.trainingRequired ?? null, data.nextVisitDate ?? null, data.remarks ?? null, data.status ?? 'Completed', getCurrentSession()?.id ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase()
      return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('visits:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE institute_visits SET purpose=?,participants=?,modules_discussed=?,findings=?,pain_areas_noted=?,training_required=?,next_visit_date=?,remarks=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [data.purpose, data.participants ?? null, data.modulesDiscussed ?? null, data.findings ?? null, data.painAreasNoted ?? null, data.trainingRequired ?? null, data.nextVisitDate ?? null, data.remarks ?? null, data.status ?? 'Completed', id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('visits:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM institute_visits WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Audits
  ipcMain.handle('audits:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT a.*, i.name as institute_name, m.name as module_name FROM audits a LEFT JOIN institutes i ON a.institute_id=i.id LEFT JOIN modules m ON a.module_id=m.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.instituteId) { sql += ` AND a.institute_id=?`; params.push(filters.instituteId) }
      if (filters?.ragStatus) { sql += ` AND a.rag_status=?`; params.push(filters.ragStatus) }
      if (filters?.moduleId) { sql += ` AND a.module_id=?`; params.push(filters.moduleId) }
      sql += ` ORDER BY a.audit_date DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('audits:getById', (_e, id: number) => {
    try { const r = getSqlJsDb().exec(`SELECT a.*, i.name as institute_name, m.name as module_name FROM audits a LEFT JOIN institutes i ON a.institute_id=i.id LEFT JOIN modules m ON a.module_id=m.id WHERE a.id=?`, [id]); return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('audits:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const score = ((data.usageScore as number ?? 0) * 0.30 + (data.adoptionScore as number ?? 0) * 0.25 + (data.qualityScore as number ?? 0) * 0.20 + (data.trainingScore as number ?? 0) * 0.15)
      const rag = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red'
      db.run(`INSERT INTO audits (audit_date,institute_id,location_id,module_id,usage_status,user_adoption,data_quality,training_status,has_issues,has_requirements,recommendation,rag_status,overall_score,audited_by,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.auditDate ?? today(), data.instituteId, data.locationId ?? null, data.moduleId, data.usageStatus, data.userAdoption, data.dataQuality, data.trainingStatus, data.hasIssues ? 1 : 0, data.hasRequirements ? 1 : 0, data.recommendation ?? null, data.ragStatus ?? rag, data.overallScore ?? score, getCurrentSession()?.fullName ?? null, data.notes ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('audits:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE audits SET usage_status=?,user_adoption=?,data_quality=?,training_status=?,has_issues=?,has_requirements=?,recommendation=?,rag_status=?,overall_score=?,notes=?,updated_at=datetime('now') WHERE id=?`,
        [data.usageStatus, data.userAdoption, data.dataQuality, data.trainingStatus, data.hasIssues ? 1 : 0, data.hasRequirements ? 1 : 0, data.recommendation ?? null, data.ragStatus, data.overallScore ?? null, data.notes ?? null, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('audits:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM audits WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('audits:getAdoptionMatrix', () => {
    try {
      const db = getSqlJsDb()
      const institutes = toObjects(db.exec(`SELECT id,name,code FROM institutes WHERE deleted_at IS NULL ORDER BY name`))
      const modules = toObjects(db.exec(`SELECT id,name,code FROM modules WHERE status='Active' ORDER BY name`))
      const adoptionData = toObjects(db.exec(`SELECT institute_id,module_id,adoption_pct,is_actively_used,rag_status FROM module_adoption`))
      const matrix: Record<string, Record<string, unknown>> = {}
      institutes.forEach(i => { matrix[i.id as number] = {} })
      adoptionData.forEach(a => { if (matrix[a.institute_id as number]) matrix[a.institute_id as number][a.module_id as number] = a })
      return { success: true, data: { institutes, modules, matrix } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('audits:getInstituteAdoption', (_e, instituteId: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT AVG(adoption_pct) as avg_adoption FROM module_adoption WHERE institute_id=? AND is_actively_used=1`, [instituteId])
      return { success: true, data: r[0]?.values[0][0] ?? 0 }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Adoption
  ipcMain.handle('adoption:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT ma.*, i.name as institute_name, m.name as module_name FROM module_adoption ma LEFT JOIN institutes i ON ma.institute_id=i.id LEFT JOIN modules m ON ma.module_id=m.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.instituteId) { sql += ` AND ma.institute_id=?`; params.push(filters.instituteId) }
      if (filters?.moduleId) { sql += ` AND ma.module_id=?`; params.push(filters.moduleId) }
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('adoption:upsert', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT OR REPLACE INTO module_adoption (institute_id,location_id,module_id,is_available,is_configured,is_live,is_actively_used,user_count,usage_frequency,adoption_pct,gap_description,action_required,owner,target_date,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
        [data.instituteId, data.locationId ?? null, data.moduleId, data.isAvailable ? 1 : 0, data.isConfigured ? 1 : 0, data.isLive ? 1 : 0, data.isActivelyUsed ? 1 : 0, data.userCount ?? null, data.usageFrequency ?? null, data.adoptionPct ?? null, data.gapDescription ?? null, data.actionRequired ?? null, data.owner ?? null, data.targetDate ?? null, data.status ?? 'Not Started'])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('adoption:getMatrix', () => {
    try {
      const db = getSqlJsDb()
      const institutes = toObjects(db.exec(`SELECT id,name,code FROM institutes WHERE deleted_at IS NULL ORDER BY name`))
      const modules = toObjects(db.exec(`SELECT id,name,code FROM modules WHERE status='Active' ORDER BY name`))
      const data = toObjects(db.exec(`SELECT * FROM module_adoption`))
      return { success: true, data: { institutes, modules, data } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Actions
  ipcMain.handle('actions:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const t = today()
      // Auto-update overdue
      db.run(`UPDATE actions SET status='overdue' WHERE due_date < ? AND status='open'`, [t])
      let sql = `SELECT a.*, i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.status) { sql += ` AND a.status=?`; params.push(filters.status) }
      if (filters?.priority) { sql += ` AND a.priority=?`; params.push(filters.priority) }
      if (filters?.owner) { sql += ` AND a.owner LIKE ?`; params.push(`%${filters.owner}%`) }
      if (filters?.instituteId) { sql += ` AND a.institute_id=?`; params.push(filters.instituteId) }
      sql += ` ORDER BY CASE a.status WHEN 'overdue' THEN 0 WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, a.due_date`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('actions:getById', (_e, id: number) => {
    try { const r = getSqlJsDb().exec(`SELECT a.*, i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.id=?`, [id]); return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('actions:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const cnt = (db.exec(`SELECT COUNT(*) FROM actions`)[0]?.values[0][0] as number ?? 0) + 1
      const ref = `ACT-${String(cnt).padStart(4, '0')}`
      db.run(`INSERT INTO actions (action_ref,action_date,source_type,source_id,institute_id,module_id,description,owner,priority,due_date,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, data.actionDate ?? today(), data.sourceType ?? null, data.sourceId ?? null, data.instituteId ?? null, data.moduleId ?? null, data.description, data.owner ?? null, data.priority ?? 'medium', data.dueDate ?? null, 'open', getCurrentSession()?.id ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id, actionRef: ref } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('actions:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE actions SET description=?,owner=?,priority=?,due_date=?,status=?,remarks=?,updated_at=datetime('now') WHERE id=?`,
        [data.description, data.owner ?? null, data.priority ?? 'medium', data.dueDate ?? null, data.status ?? 'open', data.remarks ?? null, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('actions:complete', (_e, { id, remarks }: { id: number; remarks?: string }) => {
    try {
      getSqlJsDb().run(`UPDATE actions SET status='completed',completion_date=?,remarks=?,updated_at=datetime('now') WHERE id=?`, [today(), remarks ?? null, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('actions:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM actions WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('actions:getOverdue', () => {
    try {
      const r = getSqlJsDb().exec(`SELECT a.*, i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.due_date < ? AND a.status IN ('open','in_progress','overdue') ORDER BY a.due_date`, [today()])
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Risks
  ipcMain.handle('risks:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT r.*, i.name as institute_name FROM risks r LEFT JOIN institutes i ON r.institute_id=i.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.status) { sql += ` AND r.status=?`; params.push(filters.status) }
      if (filters?.riskLevel) { sql += ` AND r.risk_level=?`; params.push(filters.riskLevel) }
      sql += ` ORDER BY r.risk_score DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('risks:getById', (_e, id: number) => {
    try { const r = getSqlJsDb().exec(`SELECT * FROM risks WHERE id=?`, [id]); return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('risks:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const cnt = (db.exec(`SELECT COUNT(*) FROM risks`)[0]?.values[0][0] as number ?? 0) + 1
      const ref = `RSK-${String(cnt).padStart(4, '0')}`
      const prob = data.probability as number; const imp = data.impact as number
      const score = prob * imp
      const level = score >= 17 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low'
      db.run(`INSERT INTO risks (risk_ref,description,institute_id,project,probability,impact,risk_score,risk_level,mitigation,owner,due_date,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, data.description, data.instituteId ?? null, data.project ?? null, prob, imp, score, level, data.mitigation ?? null, data.owner ?? null, data.dueDate ?? null, 'open'])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id, riskRef: ref } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('risks:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const prob = data.probability as number; const imp = data.impact as number
      const score = prob * imp
      const level = score >= 17 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low'
      getSqlJsDb().run(`UPDATE risks SET description=?,probability=?,impact=?,risk_score=?,risk_level=?,mitigation=?,owner=?,due_date=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [data.description, prob, imp, score, level, data.mitigation ?? null, data.owner ?? null, data.dueDate ?? null, data.status ?? 'open', id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('risks:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM risks WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Training
  ipcMain.handle('training:getSessions', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT ts.*, i.name as institute_name, m.name as module_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id LEFT JOIN modules m ON ts.module_id=m.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.instituteId) { sql += ` AND ts.institute_id=?`; params.push(filters.instituteId) }
      if (filters?.status) { sql += ` AND ts.status=?`; params.push(filters.status) }
      sql += ` ORDER BY ts.training_date DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:getSessionById', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const session = toObjects(db.exec(`SELECT ts.*, i.name as institute_name, m.name as module_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id LEFT JOIN modules m ON ts.module_id=m.id WHERE ts.id=?`, [id]))[0]
      const participants = toObjects(db.exec(`SELECT * FROM training_participants WHERE session_id=? ORDER BY participant_name`, [id]))
      return { success: true, data: { ...session, participants } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:createSession', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO training_sessions (training_date,institute_id,location_id,module_id,topic,trainer,target_audience,participant_count,actual_attendance,duration_hours,training_type,feedback,issues_raised,follow_up_required,next_training_date,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.trainingDate ?? today(), data.instituteId, data.locationId ?? null, data.moduleId ?? null, data.topic, data.trainer ?? null, data.targetAudience ?? null, data.participantCount ?? null, data.actualAttendance ?? null, data.durationHours ?? null, data.trainingType ?? 'group', data.feedback ?? null, data.issuesRaised ?? null, data.followUpRequired ? 1 : 0, data.nextTrainingDate ?? null, data.status ?? 'Planned', getCurrentSession()?.id ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:updateSession', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE training_sessions SET topic=?,trainer=?,target_audience=?,participant_count=?,actual_attendance=?,duration_hours=?,training_type=?,feedback=?,issues_raised=?,follow_up_required=?,next_training_date=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [data.topic, data.trainer ?? null, data.targetAudience ?? null, data.participantCount ?? null, data.actualAttendance ?? null, data.durationHours ?? null, data.trainingType ?? 'group', data.feedback ?? null, data.issuesRaised ?? null, data.followUpRequired ? 1 : 0, data.nextTrainingDate ?? null, data.status ?? 'Planned', id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:deleteSession', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM training_sessions WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:getParticipants', (_e, sessionId: number) => {
    try { const r = getSqlJsDb().exec(`SELECT * FROM training_participants WHERE session_id=? ORDER BY participant_name`, [sessionId]); return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:addParticipants', (_e, { sessionId, participants }: { sessionId: number; participants: Record<string, unknown>[] }) => {
    try {
      const db = getSqlJsDb()
      participants.forEach(p => { db.run(`INSERT INTO training_participants (session_id,participant_name,department,role,attended) VALUES (?,?,?,?,?)`, [sessionId, p.participantName, p.department ?? null, p.role ?? null, p.attended ? 1 : 1]) })
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:updateParticipant', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try { getSqlJsDb().run(`UPDATE training_participants SET attended=?,feedback=?,follow_up_required=? WHERE id=?`, [data.attended ? 1 : 0, data.feedback ?? null, data.followUpRequired ? 1 : 0, id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('training:removeParticipant', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM training_participants WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Pain Areas
  ipcMain.handle('painAreas:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT pa.*, i.name as institute_name, m.name as module_name FROM pain_areas pa LEFT JOIN institutes i ON pa.institute_id=i.id LEFT JOIN modules m ON pa.module_id=m.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.severity) { sql += ` AND pa.severity=?`; params.push(filters.severity) }
      if (filters?.status) { sql += ` AND pa.status=?`; params.push(filters.status) }
      if (filters?.instituteId) { sql += ` AND pa.institute_id=?`; params.push(filters.instituteId) }
      sql += ` ORDER BY pa.created_at DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('painAreas:getById', (_e, id: number) => {
    try { const r = getSqlJsDb().exec(`SELECT * FROM pain_areas WHERE id=?`, [id]); return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('painAreas:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO pain_areas (date_identified,institute_id,location_id,dept_id,module_id,reported_by,description,business_impact,frequency,severity,existing_workaround,suggested_solution,owner,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.dateIdentified ?? today(), data.instituteId, data.locationId ?? null, data.deptId ?? null, data.moduleId ?? null, data.reportedBy ?? null, data.description, data.businessImpact ?? null, data.frequency ?? null, data.severity ?? 'medium', data.existingWorkaround ?? null, data.suggestedSolution ?? null, data.owner ?? null, 'Open'])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('painAreas:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE pain_areas SET description=?,business_impact=?,frequency=?,severity=?,existing_workaround=?,suggested_solution=?,owner=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [data.description, data.businessImpact ?? null, data.frequency ?? null, data.severity ?? 'medium', data.existingWorkaround ?? null, data.suggestedSolution ?? null, data.owner ?? null, data.status ?? 'Open', id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('painAreas:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM pain_areas WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Meetings
  ipcMain.handle('meetings:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT * FROM leadership_meetings WHERE 1=1`
      const params: unknown[] = []
      if (filters?.status) { sql += ` AND status=?`; params.push(filters.status) }
      if (filters?.category) { sql += ` AND category=?`; params.push(filters.category) }
      sql += ` ORDER BY meeting_date DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('meetings:getById', (_e, id: number) => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM leadership_meetings WHERE id=?`, [id]))[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('meetings:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO leadership_meetings (meeting_date,participants,organization,category,topic,discussion,decisions,requirements_identified,action_items,owner,due_date,status,follow_up_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.meetingDate ?? today(), data.participants ?? null, data.organization ?? null, data.category ?? 'other', data.topic, data.discussion ?? null, data.decisions ?? null, data.requirementsIdentified ?? null, data.actionItems ?? null, data.owner ?? null, data.dueDate ?? null, data.status ?? 'Completed', data.followUpDate ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('meetings:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE leadership_meetings SET participants=?,organization=?,category=?,topic=?,discussion=?,decisions=?,requirements_identified=?,action_items=?,owner=?,due_date=?,status=?,follow_up_date=?,updated_at=datetime('now') WHERE id=?`,
        [data.participants ?? null, data.organization ?? null, data.category ?? 'other', data.topic, data.discussion ?? null, data.decisions ?? null, data.requirementsIdentified ?? null, data.actionItems ?? null, data.owner ?? null, data.dueDate ?? null, data.status ?? 'Completed', data.followUpDate ?? null, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('meetings:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM leadership_meetings WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Implementations
  ipcMain.handle('implementations:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT im.*, i.name as institute_name, m.name as module_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id LEFT JOIN modules m ON im.module_id=m.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.implType) { sql += ` AND im.impl_type=?`; params.push(filters.implType) }
      if (filters?.status) { sql += ` AND im.status=?`; params.push(filters.status) }
      if (filters?.instituteId) { sql += ` AND im.institute_id=?`; params.push(filters.instituteId) }
      sql += ` ORDER BY im.created_at DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('implementations:getById', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const impl = toObjects(db.exec(`SELECT im.*, i.name as institute_name, m.name as module_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id LEFT JOIN modules m ON im.module_id=m.id WHERE im.id=?`, [id]))[0]
      const tasks = toObjects(db.exec(`SELECT * FROM implementation_tasks WHERE implementation_id=? ORDER BY sort_order`, [id]))
      return { success: true, data: { ...impl, tasks } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('implementations:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const cnt = (db.exec(`SELECT COUNT(*) FROM implementations`)[0]?.values[0][0] as number ?? 0) + 1
      const ref = `IMPL-${String(cnt).padStart(4, '0')}`
      db.run(`INSERT INTO implementations (impl_ref,project_name,impl_type,institute_id,location_id,module_id,start_date,target_date,owner,status,progress_pct,dependency,risk_notes,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, data.projectName, data.implType ?? 'other', data.instituteId, data.locationId ?? null, data.moduleId ?? null, data.startDate ?? null, data.targetDate ?? null, data.owner ?? null, data.status ?? 'not_started', 0, data.dependency ?? null, data.riskNotes ?? null, data.remarks ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id, implRef: ref } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('implementations:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE implementations SET project_name=?,impl_type=?,status=?,progress_pct=?,target_date=?,actual_completion=?,owner=?,dependency=?,risk_notes=?,remarks=?,updated_at=datetime('now') WHERE id=?`,
        [data.projectName, data.implType ?? 'other', data.status ?? 'not_started', data.progressPct ?? 0, data.targetDate ?? null, data.actualCompletion ?? null, data.owner ?? null, data.dependency ?? null, data.riskNotes ?? null, data.remarks ?? null, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('implementations:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM implementations WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('implementations:getTasks', (_e, implId: number) => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM implementation_tasks WHERE implementation_id=? ORDER BY sort_order`, [implId])) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('implementations:upsertTask', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      if (data.id) {
        db.run(`UPDATE implementation_tasks SET task_name=?,assignee=?,start_date=?,target_date=?,actual_date=?,status=?,notes=?,sort_order=? WHERE id=?`,
          [data.taskName, data.assignee ?? null, data.startDate ?? null, data.targetDate ?? null, data.actualDate ?? null, data.status ?? 'not_started', data.notes ?? null, data.sortOrder ?? 0, data.id])
      } else {
        db.run(`INSERT INTO implementation_tasks (implementation_id,task_name,assignee,start_date,target_date,status,notes,sort_order) VALUES (?,?,?,?,?,?,?,?)`,
          [data.implementationId, data.taskName, data.assignee ?? null, data.startDate ?? null, data.targetDate ?? null, data.status ?? 'not_started', data.notes ?? null, data.sortOrder ?? 0])
      }
      // Update implementation progress
      const stats = db.exec(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='completed' THEN 1 END) as done FROM implementation_tasks WHERE implementation_id=?`, [data.implementationId])
      if (stats[0]?.values.length) {
        const [total, done] = stats[0].values[0]
        const pct = total ? Math.round(((done as number) / (total as number)) * 100) : 0
        db.run(`UPDATE implementations SET progress_pct=?, updated_at=datetime('now') WHERE id=?`, [pct, data.implementationId])
      }
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('implementations:deleteTask', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM implementation_tasks WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Pending Modules
  ipcMain.handle('pendingModules:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT pm.*, i.name as institute_name, m.name as module_name FROM pending_modules pm LEFT JOIN institutes i ON pm.institute_id=i.id LEFT JOIN modules m ON pm.module_id=m.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.status) { sql += ` AND pm.status=?`; params.push(filters.status) }
      if (filters?.instituteId) { sql += ` AND pm.institute_id=?`; params.push(filters.instituteId) }
      sql += ` ORDER BY pm.created_at DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('pendingModules:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO pending_modules (institute_id,location_id,module_id,current_status,reason_pending,dependency,action_required,owner,target_date,status,escalation_required,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.instituteId, data.locationId ?? null, data.moduleId, data.currentStatus ?? null, data.reasonPending ?? null, data.dependency ?? null, data.actionRequired ?? null, data.owner ?? null, data.targetDate ?? null, 'Pending', data.escalationRequired ? 1 : 0, data.remarks ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('pendingModules:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE pending_modules SET current_status=?,reason_pending=?,dependency=?,action_required=?,owner=?,target_date=?,status=?,escalation_required=?,remarks=?,updated_at=datetime('now') WHERE id=?`,
        [data.currentStatus ?? null, data.reasonPending ?? null, data.dependency ?? null, data.actionRequired ?? null, data.owner ?? null, data.targetDate ?? null, data.status ?? 'Pending', data.escalationRequired ? 1 : 0, data.remarks ?? null, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('pendingModules:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM pending_modules WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('pendingModules:getById', (_e, id: number) => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM pending_modules WHERE id=?`, [id]))[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Assignments
  ipcMain.handle('assignments:getAll', () => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM assignments ORDER BY start_date DESC`)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('assignments:getCurrent', () => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM assignments WHERE status='Active' LIMIT 1`))[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('assignments:getById', (_e, id: number) => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM assignments WHERE id=?`, [id]))[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('assignments:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO assignments (name,start_date,end_date,objectives,assigned_person,sponsor,status) VALUES (?,?,?,?,?,?,?)`,
        [data.name, data.startDate, data.endDate, data.objectives ? JSON.stringify(data.objectives) : null, data.assignedPerson, data.sponsor ?? null, data.status ?? 'Active'])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('assignments:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE assignments SET name=?,start_date=?,end_date=?,objectives=?,sponsor=?,status=?,updated_at=datetime('now') WHERE id=?`,
        [data.name, data.startDate, data.endDate, data.objectives ? JSON.stringify(data.objectives) : null, data.sponsor ?? null, data.status ?? 'Active', id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Backup
  ipcMain.handle('backup:create', async () => {
    try {
      const db = getSqlJsDb()
      const backupDir = join(app.getPath('userData'), 'backups')
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = join(backupDir, `ceim-backup-${ts}.db`)
      const data = db.export()
      writeFileSync(backupPath, Buffer.from(data))
      return { success: true, data: { path: backupPath } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('backup:listBackups', () => {
    try {
      const backupDir = join(app.getPath('userData'), 'backups')
      if (!existsSync(backupDir)) return { success: true, data: [] }
      const files = readdirSync(backupDir).filter(f => f.endsWith('.db')).map(f => ({ name: f, path: join(backupDir, f) }))
      return { success: true, data: files }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('backup:selectRestoreFile', async () => {
    const result = await dialog.showOpenDialog({ filters: [{ name: 'Database', extensions: ['db'] }], properties: ['openFile'] })
    if (result.canceled) return { success: false, error: 'Cancelled' }
    return { success: true, data: result.filePaths[0] }
  })

  // App controls
  ipcMain.handle('app:getVersion', () => ({ success: true, data: app.getVersion() }))
  ipcMain.handle('app:openExternal', (_e, url: string) => { shell.openExternal(url); return { success: true } })
  ipcMain.handle('app:showInFolder', (_e, path: string) => { shell.showItemInFolder(path); return { success: true } })
  ipcMain.handle('app:minimize', () => { BrowserWindow.getFocusedWindow()?.minimize(); return { success: true } })
  ipcMain.handle('app:maximize', () => { const w = BrowserWindow.getFocusedWindow(); if (w?.isMaximized()) w.unmaximize(); else w?.maximize(); return { success: true } })
  ipcMain.handle('app:close', () => { BrowserWindow.getFocusedWindow()?.close(); return { success: true } })

  // Reports (data only - Excel/PDF generation)
  ipcMain.handle('reports:getData', (_e, params: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const { reportType, dateFrom, dateTo, instituteId } = params
      let data: unknown
      const df = dateFrom ?? '2000-01-01'
      const dt = dateTo ?? today()

      if (reportType === 'weekly_summary' || reportType === 'monthly_summary') {
        data = {
          activities: toObjects(db.exec(`SELECT da.*, i.name as institute_name FROM daily_activities da LEFT JOIN institutes i ON da.institute_id=i.id WHERE da.activity_date BETWEEN ? AND ? ORDER BY da.activity_date DESC`, [df, dt])),
          visits: toObjects(db.exec(`SELECT v.*, i.name as institute_name FROM institute_visits v LEFT JOIN institutes i ON v.institute_id=i.id WHERE v.visit_date BETWEEN ? AND ?`, [df, dt])),
          actions: toObjects(db.exec(`SELECT * FROM actions WHERE action_date BETWEEN ? AND ?`, [df, dt])),
          trainings: toObjects(db.exec(`SELECT ts.*, i.name as institute_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id WHERE ts.training_date BETWEEN ? AND ?`, [df, dt])),
          issues: toObjects(db.exec(`SELECT * FROM issues WHERE issue_date BETWEEN ? AND ?`, [df, dt])),
        }
      } else if (reportType === 'institute_engagement') {
        let sql = `SELECT i.name, i.code, i.type,
          (SELECT COUNT(*) FROM institute_visits WHERE institute_id=i.id) as visits,
          (SELECT COUNT(*) FROM training_sessions WHERE institute_id=i.id) as trainings,
          (SELECT COUNT(*) FROM issues WHERE institute_id=i.id) as issues,
          (SELECT COUNT(*) FROM requirements WHERE institute_id=i.id AND deleted_at IS NULL) as requirements,
          (SELECT ROUND(AVG(adoption_pct),1) FROM module_adoption WHERE institute_id=i.id) as avg_adoption
          FROM institutes i WHERE i.deleted_at IS NULL`
        if (instituteId) { sql += ` AND i.id=?`; data = toObjects(db.exec(sql, [instituteId])) }
        else data = toObjects(db.exec(sql))
      } else if (reportType === 'benchmark_adoption') {
        data = {
          institutes: toObjects(db.exec(`SELECT id,name,code FROM institutes WHERE deleted_at IS NULL ORDER BY name`)),
          modules: toObjects(db.exec(`SELECT id,name,code FROM modules WHERE status='Active' ORDER BY name`)),
          adoption: toObjects(db.exec(`SELECT ma.*, i.name as institute_name, m.name as module_name FROM module_adoption ma LEFT JOIN institutes i ON ma.institute_id=i.id LEFT JOIN modules m ON ma.module_id=m.id`)),
        }
      } else if (reportType === 'requirement_pipeline') {
        let sql = `SELECT r.*, i.name as institute_name, m.name as module_name FROM requirements r LEFT JOIN institutes i ON r.institute_id=i.id LEFT JOIN modules m ON r.module_id=m.id WHERE r.deleted_at IS NULL`
        const params2: unknown[] = []
        if (instituteId) { sql += ` AND r.institute_id=?`; params2.push(instituteId) }
        sql += ` ORDER BY r.status, r.priority DESC`
        data = toObjects(db.exec(sql, params2))
      } else if (reportType === 'issue_log') {
        let sql = `SELECT iss.*, i.name as institute_name, m.name as module_name FROM issues iss LEFT JOIN institutes i ON iss.institute_id=i.id LEFT JOIN modules m ON iss.module_id=m.id WHERE 1=1`
        const params2: unknown[] = []
        if (instituteId) { sql += ` AND iss.institute_id=?`; params2.push(instituteId) }
        sql += ` ORDER BY iss.priority DESC, iss.created_at DESC`
        data = toObjects(db.exec(sql, params2))
      } else if (reportType === 'training_report') {
        data = {
          sessions: toObjects(db.exec(`SELECT ts.*, i.name as institute_name, m.name as module_name FROM training_sessions ts LEFT JOIN institutes i ON ts.institute_id=i.id LEFT JOIN modules m ON ts.module_id=m.id WHERE ts.training_date BETWEEN ? AND ? ORDER BY ts.training_date DESC`, [df, dt])),
          summary: toObjects(db.exec(`SELECT COUNT(*) as sessions, COALESCE(SUM(actual_attendance),0) as participants, COALESCE(SUM(duration_hours),0) as hours FROM training_sessions WHERE training_date BETWEEN ? AND ? AND status='Completed'`, [df, dt]))[0],
        }
      } else if (reportType === 'action_tracker') {
        data = toObjects(db.exec(`SELECT a.*, i.name as institute_name FROM actions a LEFT JOIN institutes i ON a.institute_id=i.id ORDER BY CASE a.status WHEN 'overdue' THEN 0 WHEN 'open' THEN 1 ELSE 2 END, a.due_date`))
      } else if (reportType === 'risk_register') {
        data = toObjects(db.exec(`SELECT r.*, i.name as institute_name FROM risks r LEFT JOIN institutes i ON r.institute_id=i.id ORDER BY r.risk_score DESC`))
      } else if (reportType === 'implementation_status') {
        data = {
          implementations: toObjects(db.exec(`SELECT im.*, i.name as institute_name, m.name as module_name FROM implementations im LEFT JOIN institutes i ON im.institute_id=i.id LEFT JOIN modules m ON im.module_id=m.id ORDER BY im.status, im.target_date`)),
          tasks: toObjects(db.exec(`SELECT it.*, im.project_name FROM implementation_tasks it LEFT JOIN implementations im ON it.implementation_id=im.id ORDER BY im.project_name, it.sort_order`)),
        }
      } else {
        data = []
      }
      return { success: true, data }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('reports:getBaselineMetrics', () => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM baseline_metrics ORDER BY metric_date`)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('reports:saveBaselineMetric', (_e, data: Record<string, unknown>) => {
    try {
      getSqlJsDb().run(`INSERT INTO baseline_metrics (assignment_id,metric_name,metric_value,metric_date,notes) VALUES (?,?,?,?,?)`,
        [data.assignmentId ?? null, data.metricName, data.metricValue, data.metricDate ?? today(), data.notes ?? null])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('reports:getBeforeAfterComparison', () => {
    try {
      const db = getSqlJsDb()
      const baseline = toObjects(db.exec(`SELECT * FROM baseline_metrics ORDER BY metric_date`))
      return { success: true, data: { baseline } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('reports:generateExcel', async (_e, params: Record<string, unknown>) => {
    try {
      const ExcelJS = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'CEIM Portal'; wb.created = new Date()
      const ws = wb.addWorksheet('Report')
      ws.addRow(['CEIM Portal – UAE Client Engagement & Implementation Management Portal'])
      ws.addRow([`Report: ${params.reportType}`, `Generated: ${new Date().toLocaleString()}`])
      ws.addRow([])
      const tmpPath = join(app.getPath('temp'), `ceim-report-${Date.now()}.xlsx`)
      await wb.xlsx.writeFile(tmpPath)
      shell.openPath(tmpPath)
      return { success: true, data: { path: tmpPath } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('reports:generatePDF', (_e, _params) => {
    return { success: false, error: 'PDF generation: use Export to Excel then save as PDF from Excel, or install a PDF library.' }
  })

  // Attachments — supports multiple files
  ipcMain.handle('attachments:upload', async (_e, { relatedType, relatedId }: { relatedType: string; relatedId: number }) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Documents', extensions: ['pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv'] },
          { name: 'Images', extensions: ['png','jpg','jpeg','gif','bmp','webp'] },
          { name: 'All Files', extensions: ['*'] },
        ]
      })
      if (result.canceled || result.filePaths.length === 0) return { success: false, error: 'Cancelled' }
      const attDir = join(app.getPath('userData'), 'attachments', relatedType, String(relatedId))
      if (!existsSync(attDir)) mkdirSync(attDir, { recursive: true })
      const db = getSqlJsDb()
      const uploaded: { id: number; path: string; originalName: string }[] = []
      for (const src of result.filePaths) {
        const originalName = src.split(/[/\\]/).pop() ?? 'file'
        const storedName = `${Date.now()}-${originalName}`
        const dest = join(attDir, storedName)
        copyFileSync(src, dest)
        db.run(`INSERT INTO attachments (related_type,related_id,file_name,file_path,uploaded_by) VALUES (?,?,?,?,?)`,
          [relatedType, relatedId, originalName, dest, getCurrentSession()?.id ?? null])
        const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        uploaded.push({ id, path: dest, originalName })
      }
      saveDatabase()
      return { success: true, data: uploaded }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('attachments:getByRecord', (_e, { relatedType, relatedId }: { relatedType: string; relatedId: number }) => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM attachments WHERE related_type=? AND related_id=? ORDER BY created_at DESC`, [relatedType, relatedId])) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('attachments:open', (_e, id: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT file_path FROM attachments WHERE id=?`, [id])
      const path = r[0]?.values[0][0] as string
      if (path && existsSync(path)) { shell.openPath(path); return { success: true } }
      return { success: false, error: 'File not found' }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('attachments:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM attachments WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Dependencies
  ipcMain.handle('dependencies:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT * FROM dependencies WHERE 1=1`
      const params: unknown[] = []
      if (filters?.status) { sql += ` AND status=?`; params.push(filters.status) }
      sql += ` ORDER BY created_at DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('dependencies:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO dependencies (description,related_type,related_id,dependency_on,owner,required_by_date,status,impact_if_blocked,escalation_required) VALUES (?,?,?,?,?,?,?,?,?)`,
        [data.description, data.relatedType ?? null, data.relatedId ?? null, data.dependencyOn, data.owner ?? null, data.requiredByDate ?? null, data.status ?? 'Pending', data.impactIfBlocked ?? null, data.escalationRequired ? 1 : 0])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('dependencies:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE dependencies SET description=?,dependency_on=?,owner=?,required_by_date=?,status=?,impact_if_blocked=?,escalation_required=? WHERE id=?`,
        [data.description, data.dependencyOn, data.owner ?? null, data.requiredByDate ?? null, data.status ?? 'Pending', data.impactIfBlocked ?? null, data.escalationRequired ? 1 : 0, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('dependencies:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM dependencies WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  // Compliance
  ipcMain.handle('compliance:getAll', () => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT ci.*, i.name as institute_name FROM compliance_items ci LEFT JOIN institutes i ON ci.institute_id=i.id ORDER BY ci.created_at DESC`)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('compliance:getById', (_e, id: number) => {
    try { return { success: true, data: toObjects(getSqlJsDb().exec(`SELECT * FROM compliance_items WHERE id=?`, [id]))[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('compliance:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO compliance_items (compliance_area,institute_id,dept_id,current_status,gap_description,action_required,owner,target_date,evidence,status,remarks) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [data.complianceArea, data.instituteId ?? null, data.deptId ?? null, data.currentStatus, data.gapDescription ?? null, data.actionRequired ?? null, data.owner ?? null, data.targetDate ?? null, data.evidence ?? null, data.status ?? 'Not Started', data.remarks ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase(); return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('compliance:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE compliance_items SET compliance_area=?,current_status=?,gap_description=?,action_required=?,owner=?,target_date=?,evidence=?,status=?,remarks=?,updated_at=datetime('now') WHERE id=?`,
        [data.complianceArea, data.currentStatus, data.gapDescription ?? null, data.actionRequired ?? null, data.owner ?? null, data.targetDate ?? null, data.evidence ?? null, data.status ?? 'Not Started', data.remarks ?? null, id])
      saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
  ipcMain.handle('compliance:delete', (_e, id: number) => {
    try { getSqlJsDb().run(`DELETE FROM compliance_items WHERE id=?`, [id]); saveDatabase(); return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}
