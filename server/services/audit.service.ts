import { getSqlite } from '../db'

interface AuditParams {
  userId?: number | null
  module: string
  recordId?: number | null
  action: 'create' | 'update' | 'delete' | 'status_change' | 'login' | 'logout'
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string | null
}

export function writeAuditLog(params: AuditParams): void {
  try {
    const db = getSqlite()
    db.prepare(
      `INSERT INTO audit_logs (user_id, module, record_id, action, old_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      params.userId ?? null,
      params.module,
      params.recordId ?? null,
      params.action,
      params.oldValue != null ? JSON.stringify(params.oldValue) : null,
      params.newValue != null ? JSON.stringify(params.newValue) : null,
      params.ipAddress ?? null
    )
  } catch {
    // Audit failures should never crash operations
  }
}
