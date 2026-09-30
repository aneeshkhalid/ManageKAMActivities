import { ipcMain } from 'electron'
import { getSqlJsDb, saveDatabase } from '../db'
import { getCurrentSession } from '../services/auth.service'
import { writeAuditLog } from '../services/audit.service'

function toObjects(result: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

export function registerLocationHandlers(): void {

  ipcMain.handle('locations:getAll', (_e, filters?: { instituteId?: number; status?: string }) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT l.*, i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id = i.id WHERE 1=1`
      const params: unknown[] = []
      if (filters?.instituteId) { sql += ` AND l.institute_id = ?`; params.push(filters.instituteId) }
      if (filters?.status) { sql += ` AND l.status = ?`; params.push(filters.status) }
      sql += ` ORDER BY i.name, l.name`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('locations:getByInstitute', (_e, instituteId: number) => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`SELECT * FROM locations WHERE institute_id = ? ORDER BY name`, [instituteId])
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('locations:getById', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      const r = db.exec(`SELECT l.*, i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id = i.id WHERE l.id = ?`, [id])
      return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('locations:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      db.run(
        `INSERT INTO locations (institute_id,name,city,emirate,address,contact_person,contact_number,email,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [data.instituteId, data.name, data.city ?? null, data.emirate ?? null, data.address ?? null,
         data.contactPerson ?? null, data.contactNumber ?? null, data.email ?? null, data.status ?? 'Active', data.notes ?? null]
      )
      const idR = db.exec('SELECT last_insert_rowid() as id')
      const id = idR[0].values[0][0] as number
      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'locations', recordId: id, action: 'create', newValue: data })
      const r = db.exec(`SELECT l.*, i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id = i.id WHERE l.id = ?`, [id])
      return { success: true, data: toObjects(r)[0] }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('locations:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      const user = getCurrentSession()
      db.run(
        `UPDATE locations SET name=?,city=?,emirate=?,address=?,contact_person=?,contact_number=?,email=?,status=?,notes=?,updated_at=datetime('now') WHERE id=?`,
        [data.name, data.city ?? null, data.emirate ?? null, data.address ?? null,
         data.contactPerson ?? null, data.contactNumber ?? null, data.email ?? null, data.status ?? 'Active', data.notes ?? null, id]
      )
      saveDatabase()
      writeAuditLog({ userId: user?.id, module: 'locations', recordId: id, action: 'update', newValue: data })
      const r = db.exec(`SELECT l.*, i.name as institute_name FROM locations l JOIN institutes i ON l.institute_id = i.id WHERE l.id = ?`, [id])
      return { success: true, data: toObjects(r)[0] }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('locations:delete', (_e, id: number) => {
    try {
      const db = getSqlJsDb()
      db.run(`DELETE FROM locations WHERE id = ?`, [id])
      saveDatabase()
      writeAuditLog({ userId: getCurrentSession()?.id, module: 'locations', recordId: id, action: 'delete' })
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}

export function registerDepartmentHandlers(): void {

  ipcMain.handle('departments:getAll', (_e, _filters?: unknown) => {
    try {
      const db = getSqlJsDb()
      const sql = `SELECT d.* FROM departments d WHERE 1=1 ORDER BY d.name`
      return { success: true, data: toObjects(db.exec(sql)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('departments:getByInstitute', (_e, _instituteId: number) => {
    // Now departments are global — return all departments regardless of institute
    try {
      const r = getSqlJsDb().exec(`SELECT * FROM departments ORDER BY name`)
      return { success: true, data: toObjects(r) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('departments:getById', (_e, id: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT * FROM departments WHERE id = ?`, [id])
      return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('departments:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      // institute_id is now NULL — departments are shared across all institutes
      db.run(`INSERT INTO departments (institute_id, name, code, status, description) VALUES (NULL,?,?,?,?)`,
        [data.name, data.code ?? null, data.status ?? 'Active', data.description ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase()
      return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('departments:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      getSqlJsDb().run(`UPDATE departments SET name=?,code=?,status=?,description=?,updated_at=datetime('now') WHERE id=?`,
        [data.name, data.code ?? null, data.status ?? 'Active', data.description ?? null, id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('departments:delete', (_e, id: number) => {
    try {
      getSqlJsDb().run(`DELETE FROM departments WHERE id = ?`, [id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}

export function registerModuleHandlers(): void {

  ipcMain.handle('modules:getAll', (_e, filters?: { status?: string }) => {
    try {
      const db = getSqlJsDb()
      let sql = `SELECT * FROM modules WHERE 1=1`
      const params: unknown[] = []
      if (filters?.status) { sql += ` AND status = ?`; params.push(filters.status) }
      sql += ` ORDER BY name`
      return { success: true, data: toObjects(db.exec(sql, params)) }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('modules:getById', (_e, id: number) => {
    try {
      const r = getSqlJsDb().exec(`SELECT * FROM modules WHERE id = ?`, [id])
      return { success: true, data: toObjects(r)[0] ?? null }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('modules:create', (_e, data: Record<string, unknown>) => {
    try {
      const db = getSqlJsDb()
      db.run(`INSERT INTO modules (code,name,product,category,description,status,owner,notes) VALUES (?,?,?,?,?,?,?,?)`,
        [data.code, data.name, data.product ?? null, data.category ?? null, data.description ?? null, data.status ?? 'Active', data.owner ?? null, data.notes ?? null])
      const id = db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number
      saveDatabase()
      return { success: true, data: { id } }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('modules:update', (_e, { id, data }: { id: number; data: Record<string, unknown> }) => {
    try {
      const db = getSqlJsDb()
      db.run(`UPDATE modules SET name=?,product=?,category=?,description=?,status=?,owner=?,notes=?,updated_at=datetime('now') WHERE id=?`,
        [data.name, data.product ?? null, data.category ?? null, data.description ?? null, data.status ?? 'Active', data.owner ?? null, data.notes ?? null, id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })

  ipcMain.handle('modules:delete', (_e, id: number) => {
    try {
      getSqlJsDb().run(`DELETE FROM modules WHERE id = ?`, [id])
      saveDatabase()
      return { success: true }
    } catch (err) { return { success: false, error: (err as Error).message } }
  })
}
