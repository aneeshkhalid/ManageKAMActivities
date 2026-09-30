import { ipcMain } from 'electron'
import { getSqlJsDb, saveDatabase } from '../db'
import { getCurrentSession } from '../services/auth.service'
import { writeAuditLog } from '../services/audit.service'

// ─── Utility: rows to objects ─────────────────────────────────
function toObjects(result: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

export function registerInstituteHandlers(): void {

  ipcMain.handle('institutes:getAll', (_e, filters?: { search?: string; status?: string }) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT i.*, 
        (SELECT COUNT(*) FROM locations WHERE institute_id = i.id) as location_count,
        (SELECT COUNT(*) FROM institute_visits WHERE institute_id = i.id) as visit_count,
        (SELECT COUNT(*) FROM requirements WHERE institute_id = i.id AND deleted_at IS NULL) as req_count,
        (SELECT COUNT(*) FROM issues WHERE institute_id = i.id) as issue_count
        FROM institutes i WHERE i.deleted_at IS NULL`
      const params: unknown[] = []
      if (filters?.search) { sql += ` AND (i.name LIKE ? OR i.code LIKE ?)`;  params.push(`%${filters.search}%`, `%${filters.search}%`) }
      if (filters?.status) { sql += ` AND i.status = ?`; params.push(filters.status) }
      sql += ` ORDER BY i.name`
      const result = db.exec(sql, params)
      return { success: true, data: toObjects(result) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('institutes:getById', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`SELECT * FROM institutes WHERE id = ? AND deleted_at IS NULL`, [id])
      const data = toObjects(r)[0] ?? null
      return { success: true, data }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('institutes:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      db.run(
        `INSERT INTO institutes (code,name,type,org,description,status,primary_contact,email,phone,notes)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [data.code, data.name, data.type ?? 'School', data.org ?? null, data.description ?? null,
         data.status ?? 'Active', data.primaryContact ?? null, data.email ?? null, data.phone ?? null, data.notes ?? null]
      )
      const idR = db.exec('SELECT last_insert_rowid() as id')
      const id = idR[0].values[0][0] as number
      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'institutes', recordId: id, action: 'create', newValue: data })
      const r = db.exec(`SELECT * FROM institutes WHERE id = ?`, [id])
      return { success: true, data: toObjects(r)[0] }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('institutes:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      const old = toObjects(db.exec(`SELECT * FROM institutes WHERE id = ?`, [id]))[0]
      db.run(
        `UPDATE institutes SET name=?,type=?,org=?,description=?,status=?,primary_contact=?,email=?,phone=?,notes=?,updated_at=datetime('now') WHERE id=?`,
        [data.name ?? old.name, data.type ?? old.type, data.org ?? null, data.description ?? null,
         data.status ?? old.status, data.primaryContact ?? null, data.email ?? null, data.phone ?? null, data.notes ?? null, id]
      )
      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'institutes', recordId: id, action: 'update', oldValue: old, newValue: data })
      const r = db.exec(`SELECT * FROM institutes WHERE id = ?`, [id])
      return { success: true, data: toObjects(r)[0] }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('institutes:delete', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      db.run(`UPDATE institutes SET deleted_at = datetime('now') WHERE id = ?`, [id])
      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'institutes', recordId: id, action: 'delete' })
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('institutes:getStats', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const visits = db.exec(`SELECT COUNT(*) as cnt FROM institute_visits WHERE institute_id = ?`, [id])
      const audits = db.exec(`SELECT COUNT(*) as cnt FROM audits WHERE institute_id = ?`, [id])
      const reqs = db.exec(`SELECT COUNT(*) as cnt FROM requirements WHERE institute_id = ? AND deleted_at IS NULL`, [id])
      const issues = db.exec(`SELECT COUNT(*) as cnt FROM issues WHERE institute_id = ?`, [id])
      const trainings = db.exec(`SELECT COUNT(*) as cnt FROM training_sessions WHERE institute_id = ?`, [id])
      const adoption = db.exec(`SELECT AVG(adoption_pct) as avg FROM module_adoption WHERE institute_id = ?`, [id])
      return {
        success: true, data: {
          visits: visits[0]?.values[0][0] ?? 0,
          audits: audits[0]?.values[0][0] ?? 0,
          requirements: reqs[0]?.values[0][0] ?? 0,
          issues: issues[0]?.values[0][0] ?? 0,
          trainings: trainings[0]?.values[0][0] ?? 0,
          adoptionPct: adoption[0]?.values[0][0] ?? 0,
        }
      }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}
