import type { BrowserWindow } from 'electron'
import { getSqlJsDb, saveDatabase } from '../db'
import log from 'electron-log'

export function startNotificationChecker(getWindow: () => BrowserWindow | null): void {
  // Check every 5 minutes
  setInterval(() => checkAndNotify(getWindow), 5 * 60 * 1000)
  // Also check on startup after 10s
  setTimeout(() => checkAndNotify(getWindow), 10_000)
}

function checkAndNotify(getWindow: () => BrowserWindow | null): void {
  try {
    const db = getSqlJsDb()
    const today = new Date().toISOString().split('T')[0]

    // Count overdue actions
    const overdueResult = db.exec(
      `SELECT COUNT(*) as cnt FROM actions WHERE due_date < ? AND status IN ('open','in_progress')`,
      [today]
    )
    const overdueCount = overdueResult[0]?.values[0][0] as number ?? 0

    // Count pending approvals
    const approvalResult = db.exec(
      `SELECT COUNT(*) as cnt FROM requirements WHERE status = 'approval_pending' AND deleted_at IS NULL`
    )
    const approvalCount = approvalResult[0]?.values[0][0] as number ?? 0

    const totalUnread = overdueCount + approvalCount

    // Create notifications in DB if needed
    if (overdueCount > 0) {
      db.run(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (NULL, 'overdue_action', 'Overdue Actions', ?)`,
        [`${overdueCount} action(s) are overdue and require immediate attention.`]
      )
      saveDatabase()
    }

    if (approvalCount > 0) {
      db.run(
        `INSERT INTO notifications (user_id, type, title, message)
         VALUES (NULL, 'approval_pending', 'Approvals Pending', ?)`,
        [`${approvalCount} requirement(s) are waiting for approval.`]
      )
      saveDatabase()
    }

    // Send IPC to renderer
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send('notifications:unread-count', totalUnread)
    }
  } catch (err) {
    log.error('Notification check error:', err)
  }
}
