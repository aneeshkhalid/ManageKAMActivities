import { getSqlite } from '../db'

export function startNotificationChecker(): void {
  // Check every 5 minutes
  setInterval(checkAndNotify, 5 * 60 * 1000)
  // Also check on startup after 10s
  setTimeout(checkAndNotify, 10_000)
}

function checkAndNotify(): void {
  try {
    const db = getSqlite()
    const today = new Date().toISOString().split('T')[0]

    const overdueCount = (db.prepare(
      `SELECT COUNT(*) as cnt FROM actions WHERE due_date < ? AND status IN ('open','in_progress')`
    ).get(today) as { cnt: number }).cnt

    const approvalCount = (db.prepare(
      `SELECT COUNT(*) as cnt FROM requirements WHERE status = 'approval_pending' AND deleted_at IS NULL`
    ).get() as { cnt: number }).cnt

    if (overdueCount > 0) {
      db.prepare(
        `INSERT INTO notifications (user_id, type, title, message) VALUES (NULL, 'overdue_action', 'Overdue Actions', ?)`
      ).run(`${overdueCount} action(s) are overdue and require immediate attention.`)
    }

    if (approvalCount > 0) {
      db.prepare(
        `INSERT INTO notifications (user_id, type, title, message) VALUES (NULL, 'approval_pending', 'Approvals Pending', ?)`
      ).run(`${approvalCount} requirement(s) are waiting for approval.`)
    }
  } catch (err) {
    console.error('[Notifications] Check error:', err)
  }
}
