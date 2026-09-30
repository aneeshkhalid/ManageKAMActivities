import { getSqlJsDb, saveDatabase } from '../db'

interface AuditParams {
  userId?: number | null
  module: string
  recordId?: number | null
  action: 'create' | 'update' | 'delete' | 'status_change' | 'login' | 'logout'
  oldValue?: unknown
  newValue?: unknown
}

export function writeAuditLog(params: AuditParams): void {
  try {
    const db = getSqlJsDb()
    db.run(
      `INSERT INTO audit_logs (user_id, module, record_id, action, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.userId ?? null,
        params.module,
        params.recordId ?? null,
        params.action,
        params.oldValue != null ? JSON.stringify(params.oldValue) : null,
        params.newValue != null ? JSON.stringify(params.newValue) : null,
      ]
    )
  } catch {
    // Audit log failures should never crash the main operation
  }
}
