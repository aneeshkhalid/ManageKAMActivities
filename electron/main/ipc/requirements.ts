import { ipcMain } from 'electron'
import { getSqlJsDb, saveDatabase } from '../db'
import { getCurrentSession } from '../services/auth.service'
import { writeAuditLog } from '../services/audit.service'

function toObjects(result: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

function today(): string { return new Date().toISOString().split('T')[0] }

// ─── Requirements Status Workflow ─────────────────────────────
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

export function registerRequirementHandlers(): void {

  ipcMain.handle('requirements:getAll', (_e, filters?: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT r.*,
        i.name as institute_name, l.name as location_name, m.name as module_name,
        d.name as department_name
        FROM requirements r
        LEFT JOIN institutes i ON r.institute_id=i.id
        LEFT JOIN locations l ON r.location_id=l.id
        LEFT JOIN modules m ON r.module_id=m.id
        LEFT JOIN departments d ON r.dept_id=d.id
        WHERE r.deleted_at IS NULL`
      const params: unknown[] = []
      if (filters?.instituteId) { sql += ` AND r.institute_id=?`; params.push(filters.instituteId) }
      if (filters?.status) { sql += ` AND r.status=?`; params.push(filters.status) }
      if (filters?.priority) { sql += ` AND r.priority=?`; params.push(filters.priority) }
      if (filters?.moduleId) { sql += ` AND r.module_id=?`; params.push(filters.moduleId) }
      if (filters?.search) { sql += ` AND (r.title LIKE ? OR r.req_ref LIKE ?)`; params.push(`%${filters.search}%`, `%${filters.search}%`) }
      sql += ` ORDER BY r.created_at DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:getById', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`SELECT r.*, i.name as institute_name, l.name as location_name, m.name as module_name
        FROM requirements r
        LEFT JOIN institutes i ON r.institute_id=i.id
        LEFT JOIN locations l ON r.location_id=l.id
        LEFT JOIN modules m ON r.module_id=m.id
        WHERE r.id=? AND r.deleted_at IS NULL`, [id])
      const req = toObjects(r)[0] ?? null
      if (!req) return { success: false, error: 'Requirement not found' }

      const estimation = toObjects(db.exec(`SELECT * FROM requirement_estimations WHERE requirement_id=?`, [id]))[0] ?? null
      const approval = toObjects(db.exec(`SELECT * FROM requirement_approvals WHERE requirement_id=?`, [id]))[0] ?? null
      const history = toObjects(db.exec(`SELECT * FROM requirement_history WHERE requirement_id=? ORDER BY changed_at ASC`, [id]))
      const sprints = toObjects(db.exec(`SELECT * FROM sprints WHERE requirement_id=? ORDER BY created_at DESC`, [id]))

      return { success: true, data: { ...req, estimation, approval, history, sprints } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      const year = new Date().getFullYear()
      const cnt = (db.exec(`SELECT COUNT(*) as c FROM requirements WHERE req_ref LIKE ?`, [`REQ-${year}-%`])[0]?.values[0][0] as number ?? 0) + 1
      const ref = `REQ-${year}-${String(cnt).padStart(4, '0')}`

      db.run(
        `INSERT INTO requirements (req_ref,date_identified,institute_id,location_id,dept_id,module_id,title,description,business_need,user_impact,business_impact,priority,source,requested_by,portfolio_manager,status,remarks)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [ref, data.dateIdentified ?? today(), data.instituteId, data.locationId ?? null, data.deptId ?? null,
         data.moduleId ?? null, data.title, data.description, data.businessNeed ?? null,
         data.userImpact ?? null, data.businessImpact ?? null, data.priority ?? 'medium',
         data.source ?? 'direct', data.requestedBy ?? null, user?.fullName ?? null,
         data.status ?? 'identified', data.remarks ?? null]
      )
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      db.run(`INSERT INTO requirement_history (requirement_id,to_status,changed_by,notes) VALUES (?,?,?,?)`,
        [id, 'identified', user?.fullName ?? 'System', 'Requirement created'])
      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'requirements', recordId: id, action: 'create', newValue: { ref } })
      return { success: true, data: { id, reqRef: ref } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      db.run(
        `UPDATE requirements SET title=?,description=?,business_need=?,user_impact=?,business_impact=?,priority=?,source=?,requested_by=?,product_owner=?,remarks=?,updated_at=datetime('now') WHERE id=?`,
        [data.title, data.description, data.businessNeed ?? null, data.userImpact ?? null,
         data.businessImpact ?? null, data.priority ?? 'medium', data.source ?? 'direct',
         data.requestedBy ?? null, data.productOwner ?? null, data.remarks ?? null, id]
      )
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:delete', (_e, id: number) => {
    try {
      getSqlJsDb().run(`UPDATE requirements SET deleted_at=datetime('now') WHERE id=?`, [id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:advanceStatus', (_e, { id, toStatus, notes }: { id: number; toStatus: string; notes?: string }) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      const r = db.exec(`SELECT status FROM requirements WHERE id=?`, [id])
      const fromStatus = r[0]?.values[0][0] as string
      const allowed = VALID_TRANSITIONS[fromStatus] ?? []
      if (!allowed.includes(toStatus)) {
        return { success: false, error: `Cannot move from '${fromStatus}' to '${toStatus}'` }
      }
      db.run(`UPDATE requirements SET status=?,updated_at=datetime('now') WHERE id=?`, [toStatus, id])
      db.run(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`,
        [id, fromStatus, toStatus, user?.fullName ?? 'System', notes ?? null])
      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'requirements', recordId: id, action: 'status_change', oldValue: fromStatus, newValue: toStatus })
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:getHistory', (_e, id: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT * FROM requirement_history WHERE requirement_id=? ORDER BY changed_at ASC`, [id])
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:saveEstimation', (_e, { requirementId, data }: { requirementId: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      const exists = db.exec(`SELECT id FROM requirement_estimations WHERE requirement_id=?`, [requirementId])
      if (exists[0]?.values.length) {
        db.run(`UPDATE requirement_estimations SET technical_complexity=?,dev_effort_days=?,qa_effort_days=?,dependencies=?,estimated_sprint=?,estimated_release_date=?,estimator=?,estimation_date=?,remarks=? WHERE requirement_id=?`,
          [data.technicalComplexity, data.devEffortDays ?? null, data.qaEffortDays ?? null, data.dependencies ?? null,
           data.estimatedSprint ?? null, data.estimatedReleaseDate ?? null, data.estimator ?? null,
           data.estimationDate ?? today(), data.remarks ?? null, requirementId])
      } else {
        db.run(`INSERT INTO requirement_estimations (requirement_id,technical_complexity,dev_effort_days,qa_effort_days,dependencies,estimated_sprint,estimated_release_date,estimator,estimation_date,remarks) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [requirementId, data.technicalComplexity, data.devEffortDays ?? null, data.qaEffortDays ?? null,
           data.dependencies ?? null, data.estimatedSprint ?? null, data.estimatedReleaseDate ?? null,
           data.estimator ?? null, data.estimationDate ?? today(), data.remarks ?? null])
      }
      // Auto-advance status to 'estimated' if currently 'estimation_pending'
      const cur = db.exec(`SELECT status FROM requirements WHERE id=?`, [requirementId])
      if (cur[0]?.values[0][0] === 'estimation_pending') {
        db.run(`UPDATE requirements SET status='estimated', updated_at=datetime('now') WHERE id=?`, [requirementId])
        db.run(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`,
          [requirementId, 'estimation_pending', 'estimated', getCurrentSession()?.fullName ?? 'System', 'Estimation completed'])
      }
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:saveApproval', (_e, { requirementId, data }: { requirementId: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      const exists = db.exec(`SELECT id FROM requirement_approvals WHERE requirement_id=?`, [requirementId])
      if (exists[0]?.values.length) {
        db.run(`UPDATE requirement_approvals SET priority=?,business_justification=?,estimated_effort=?,impact=?,dependency=?,approval_status=?,approved_by=?,approval_date=?,comments=? WHERE requirement_id=?`,
          [data.priority, data.businessJustification ?? null, data.estimatedEffort ?? null, data.impact ?? null,
           data.dependency ?? null, data.approvalStatus ?? 'pending', data.approvedBy ?? null,
           data.approvalDate ?? null, data.comments ?? null, requirementId])
      } else {
        db.run(`INSERT INTO requirement_approvals (requirement_id,priority,business_justification,estimated_effort,impact,dependency,approval_status,approved_by,approval_date,comments) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [requirementId, data.priority, data.businessJustification ?? null, data.estimatedEffort ?? null,
           data.impact ?? null, data.dependency ?? null, data.approvalStatus ?? 'pending',
           data.approvedBy ?? null, data.approvalDate ?? null, data.comments ?? null])
      }
      // Advance status based on approval decision
      if (data.approvalStatus === 'approved') {
        db.run(`UPDATE requirements SET status='approved', updated_at=datetime('now') WHERE id=?`, [requirementId])
        db.run(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`,
          [requirementId, 'approval_pending', 'approved', user?.fullName ?? 'System', `Approved by: ${data.approvedBy}`])
      } else if (data.approvalStatus === 'rejected') {
        db.run(`UPDATE requirements SET status='rejected', updated_at=datetime('now') WHERE id=?`, [requirementId])
        db.run(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`,
          [requirementId, 'approval_pending', 'rejected', user?.fullName ?? 'System', data.comments as string ?? null])
      } else if (data.approvalStatus === 'deferred') {
        db.run(`UPDATE requirements SET status='deferred', updated_at=datetime('now') WHERE id=?`, [requirementId])
        db.run(`INSERT INTO requirement_history (requirement_id,from_status,to_status,changed_by,notes) VALUES (?,?,?,?,?)`,
          [requirementId, 'approval_pending', 'deferred', user?.fullName ?? 'System', data.comments as string ?? null])
      }
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:saveSprint', (_e, { requirementId, data }: { requirementId: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO sprints (name,requirement_id,dev_team,start_date,planned_completion,status,developer,qa_person) VALUES (?,?,?,?,?,?,?,?)`,
        [data.name, requirementId, data.devTeam ?? null, data.startDate ?? null, data.plannedCompletion ?? null,
         data.status ?? 'planned', data.developer ?? null, data.qaPerson ?? null])
      // Advance req to sprint_planned
      db.run(`UPDATE requirements SET status='sprint_planned', updated_at=datetime('now') WHERE id=? AND status='approved'`, [requirementId])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:getUATRecords', (_e, requirementId: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT * FROM uat_records WHERE requirement_id=? ORDER BY created_at DESC`, [requirementId])
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:saveUATRecord', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO uat_records (requirement_id,sprint_id,test_case,test_date,tester,result,defect_description,client_confirmation,notes) VALUES (?,?,?,?,?,?,?,?,?)`,
        [data.requirementId, data.sprintId ?? null, data.testCase, data.testDate ?? today(),
         data.tester ?? null, data.result ?? 'not_tested', data.defectDescription ?? null,
         data.clientConfirmation ? 1 : 0, data.notes ?? null])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('requirements:getPipelineStats', () => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`SELECT status, COUNT(*) as cnt FROM requirements WHERE deleted_at IS NULL GROUP BY status`)
      const stats: Record<string, number> = {}
      if (r.length) r[0].values.forEach(row => { stats[row[0] as string] = row[1] as number })
      return { success: true, data: stats }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}
