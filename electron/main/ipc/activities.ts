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

// ─── Auto-generate sequential refs ───────────────────────────
function nextRef(db: ReturnType<typeof getSqlJsDb>, table: string, refCol: string, prefix: string, yearBased = true): string {
  const year = new Date().getFullYear()
  const pattern = yearBased ? `${prefix}-${year}-%` : `${prefix}-%`
  const r = db.exec(`SELECT COUNT(*) as cnt FROM ${table} WHERE ${refCol} LIKE ?`, [pattern])
  const count = (r[0]?.values[0][0] as number ?? 0) + 1
  return yearBased ? `${prefix}-${year}-${String(count).padStart(4, '0')}` : `${prefix}-${String(count).padStart(4, '0')}`
}

export function registerActivityHandlers(): void {

  // ─── PRIMARY ENTRY POINT: Create Daily Activity ────────────
  ipcMain.handle('activities:create', async (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()

      // 1. Insert into daily_activities
      db.run(
        `INSERT INTO daily_activities (date,institute_id,location_id,dept_id,module_id,activity_type,description,people_met,findings,action_required,owner,due_date,status,remarks,created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.date ?? today(), data.instituteId ?? null, data.locationId ?? null, data.deptId ?? null,
         data.moduleId ?? null, data.activityType, data.description, data.peopleMet ?? null,
         data.findings ?? null, data.actionRequired ?? null, data.owner ?? null, data.dueDate ?? null,
         data.status ?? 'Logged', data.remarks ?? null, user?.id ?? null]
      )
      const activityId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number

      // 2. Route to module-specific table based on activity type
      let relatedId: number | null = null
      let relatedType: string | null = null

      const type = data.activityType as string
      const sub = (data.subData ?? {}) as Record<string, unknown>

      if (type === 'institute_visit') {
        db.run(
          `INSERT INTO institute_visits (visit_date,institute_id,location_id,purpose,participants,modules_discussed,findings,pain_areas_noted,training_required,next_visit_date,remarks,status,daily_activity_id,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [data.date ?? today(), data.instituteId, data.locationId ?? null, sub.purpose ?? data.description,
           data.peopleMet ?? null, sub.modulesDiscussed ?? null, data.findings ?? null,
           sub.painAreasNoted ?? null, sub.trainingRequired ?? null, sub.nextVisitDate ?? null,
           data.remarks ?? null, 'Completed', activityId, user?.id ?? null]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        relatedType = 'visit'

      } else if (type === 'training_session') {
        db.run(
          `INSERT INTO training_sessions (training_date,institute_id,location_id,module_id,topic,trainer,target_audience,participant_count,actual_attendance,duration_hours,training_type,feedback,issues_raised,follow_up_required,next_training_date,status,daily_activity_id,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [data.date ?? today(), data.instituteId, data.locationId ?? null, data.moduleId ?? null,
           sub.topic ?? data.description, sub.trainer ?? null, sub.targetAudience ?? data.peopleMet ?? null,
           sub.participantCount ?? null, sub.actualAttendance ?? null, sub.durationHours ?? null,
           sub.trainingType ?? 'group', sub.feedback ?? null, sub.issuesRaised ?? null,
           sub.followUpRequired ? 1 : 0, sub.nextTrainingDate ?? null, 'Completed', activityId, user?.id ?? null]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        relatedType = 'training'

      } else if (type === 'benchmark_audit') {
        // Calculate score
        const usageMap: Record<string, number> = { fully_used: 100, partially_used: 60, not_used: 0, not_applicable: 0 }
        const adoptionMap: Record<string, number> = { high: 100, medium: 60, low: 30, none: 0 }
        const qualityMap: Record<string, number> = { good: 100, needs_improvement: 60, poor: 0 }
        const trainingMap: Record<string, number> = { trained: 100, partially_trained: 60, not_trained: 0 }
        const score = (
          (usageMap[sub.usageStatus as string] ?? 0) * 0.30 +
          (adoptionMap[sub.userAdoption as string] ?? 0) * 0.25 +
          (qualityMap[sub.dataQuality as string] ?? 0) * 0.20 +
          (trainingMap[sub.trainingStatus as string] ?? 0) * 0.15
        )
        const rag = score >= 70 ? 'green' : score >= 40 ? 'amber' : 'red'
        db.run(
          `INSERT INTO audits (audit_date,institute_id,location_id,module_id,usage_status,user_adoption,data_quality,training_status,has_issues,has_requirements,recommendation,rag_status,overall_score,audited_by,notes,daily_activity_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [data.date ?? today(), data.instituteId, data.locationId ?? null, data.moduleId,
           sub.usageStatus ?? 'not_used', sub.userAdoption ?? 'none', sub.dataQuality ?? 'poor',
           sub.trainingStatus ?? 'not_trained', sub.hasIssues ? 1 : 0, sub.hasRequirements ? 1 : 0,
           sub.recommendation ?? null, rag, score, user?.fullName ?? null, data.remarks ?? null, activityId]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        relatedType = 'audit'

      } else if (type === 'issue_identified') {
        const ref = nextRef(db, 'issues', 'issue_ref', 'ISS', true)
        db.run(
          `INSERT INTO issues (issue_ref,issue_date,institute_id,location_id,module_id,description,category,priority,impact,root_cause,workaround,assigned_to,target_date,status,daily_activity_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [ref, data.date ?? today(), data.instituteId, data.locationId ?? null, data.moduleId ?? null,
           sub.description ?? data.description, sub.category ?? 'functional', sub.priority ?? 'medium',
           sub.impact ?? null, sub.rootCause ?? null, sub.workaround ?? null, sub.assignedTo ?? null,
           sub.targetDate ?? null, 'open', activityId]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        relatedType = 'issue'

      } else if (type === 'requirement_captured') {
        const ref = nextRef(db, 'requirements', 'req_ref', 'REQ', true)
        db.run(
          `INSERT INTO requirements (req_ref,date_identified,institute_id,location_id,dept_id,module_id,title,description,business_need,user_impact,business_impact,priority,source,requested_by,portfolio_manager,status,remarks,daily_activity_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [ref, data.date ?? today(), data.instituteId, data.locationId ?? null, data.deptId ?? null,
           data.moduleId ?? null, sub.title ?? data.description, sub.description ?? data.description,
           sub.businessNeed ?? null, sub.userImpact ?? null, sub.businessImpact ?? null,
           sub.priority ?? 'medium', sub.source ?? 'direct', sub.requestedBy ?? data.peopleMet ?? null,
           user?.fullName ?? null, 'identified', data.remarks ?? null, activityId]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        // Add to history
        db.run(`INSERT INTO requirement_history (requirement_id,to_status,changed_by,notes) VALUES (?,?,?,?)`,
          [relatedId, 'identified', user?.fullName ?? 'System', 'Captured via Daily Log'])
        relatedType = 'requirement'

      } else if (type === 'pain_area_identified') {
        db.run(
          `INSERT INTO pain_areas (date_identified,institute_id,location_id,dept_id,module_id,reported_by,description,business_impact,frequency,severity,existing_workaround,suggested_solution,owner,status,daily_activity_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [data.date ?? today(), data.instituteId, data.locationId ?? null, data.deptId ?? null,
           data.moduleId ?? null, data.peopleMet ?? null, sub.description ?? data.description,
           sub.businessImpact ?? null, sub.frequency ?? null, sub.severity ?? 'medium',
           sub.existingWorkaround ?? null, sub.suggestedSolution ?? null, user?.fullName ?? null, 'Open', activityId]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        relatedType = 'pain_area'

      } else if (type === 'leadership_meeting') {
        db.run(
          `INSERT INTO leadership_meetings (meeting_date,participants,organization,category,topic,discussion,decisions,requirements_identified,action_items,owner,due_date,status,follow_up_date,daily_activity_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [data.date ?? today(), data.peopleMet ?? null, sub.organization ?? null, sub.category ?? 'other',
           sub.topic ?? data.description, sub.discussion ?? data.findings ?? null,
           sub.decisions ?? null, sub.requirementsIdentified ?? null, sub.actionItems ?? data.actionRequired ?? null,
           user?.fullName ?? null, data.dueDate ?? null, 'Completed', sub.followUpDate ?? null, activityId]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        relatedType = 'meeting'

      } else if (type === 'action_created') {
        const ref = nextRef(db, 'actions', 'action_ref', 'ACT', false)
        db.run(
          `INSERT INTO actions (action_ref,action_date,source_type,institute_id,module_id,description,owner,priority,due_date,status,created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [ref, data.date ?? today(), 'daily_log', data.instituteId ?? null, data.moduleId ?? null,
           sub.description ?? data.description, sub.owner ?? data.owner ?? null,
           sub.priority ?? 'medium', sub.dueDate ?? data.dueDate ?? null, 'open', user?.id ?? null]
        )
        relatedId = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
        relatedType = 'action'
      }

      // 3. Update daily_activity with related record link
      if (relatedId) {
        db.run(`UPDATE daily_activities SET related_id=?, related_type=? WHERE id=?`, [relatedId, relatedType, activityId])
      }

      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'daily_activities', recordId: activityId, action: 'create', newValue: { activityType: type } })

      return { success: true, data: { activityId, relatedId, relatedType } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('activities:getAll', (_e, filters?: { date?: string; instituteId?: number; activityType?: string }) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT a.*, i.name as institute_name, l.name as location_name, m.name as module_name
                 FROM daily_activities a
                 LEFT JOIN institutes i ON a.institute_id = i.id
                 LEFT JOIN locations l ON a.location_id = l.id
                 LEFT JOIN modules m ON a.module_id = m.id
                 WHERE 1=1`
      const params: unknown[] = []
      if (filters?.date) { sql += ` AND a.date = ?`; params.push(filters.date) }
      if (filters?.instituteId) { sql += ` AND a.institute_id = ?`; params.push(filters.instituteId) }
      if (filters?.activityType) { sql += ` AND a.activity_type = ?`; params.push(filters.activityType) }
      sql += ` ORDER BY a.date DESC, a.created_at DESC`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('activities:getToday', () => {
    try {
      const db = getSqlJsDb()
      const t = today()
      const r = db.exec(
        `SELECT a.*, i.name as institute_name, l.name as location_name, m.name as module_name
         FROM daily_activities a
         LEFT JOIN institutes i ON a.institute_id = i.id
         LEFT JOIN locations l ON a.location_id = l.id
         LEFT JOIN modules m ON a.module_id = m.id
         WHERE a.date = ? ORDER BY a.created_at DESC`, [t])
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('activities:getByDate', (_e, date: string) => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(
        `SELECT a.*, i.name as institute_name, l.name as location_name, m.name as module_name
         FROM daily_activities a
         LEFT JOIN institutes i ON a.institute_id = i.id
         LEFT JOIN locations l ON a.location_id = l.id
         LEFT JOIN modules m ON a.module_id = m.id
         WHERE a.date = ? ORDER BY a.created_at DESC`, [date])
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('activities:getById', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`SELECT a.*, i.name as institute_name FROM daily_activities a LEFT JOIN institutes i ON a.institute_id=i.id WHERE a.id=?`, [id])
      return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('activities:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      db.run(`UPDATE daily_activities SET description=?,findings=?,remarks=?,status=?,action_required=?,owner=?,due_date=?,updated_at=datetime('now') WHERE id=?`,
        [data.description, data.findings ?? null, data.remarks ?? null, data.status ?? 'Logged', data.actionRequired ?? null, data.owner ?? null, data.dueDate ?? null, id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('activities:delete', (_e, id: number) => {
    try {
      getSqlJsDb().run(`DELETE FROM daily_activities WHERE id=?`, [id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}
