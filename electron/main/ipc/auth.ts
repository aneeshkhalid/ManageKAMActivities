import { ipcMain } from 'electron'
import bcrypt from 'bcryptjs'
import { getSqlJsDb, saveDatabase } from '../db'
import { setCurrentSession, getCurrentSession } from '../services/auth.service'
import { writeAuditLog } from '../services/audit.service'

export function registerAuthHandlers(): void {

  ipcMain.handle('auth:login', async (_e, { username, password }: { username: string; password: string }) => {
    try {
      const db = getSqlJsDb()
      const result = db.exec(
        `SELECT id, username, password_hash, full_name, email, role, status, created_at, updated_at
         FROM users WHERE username = ? AND status = 'active' LIMIT 1`,
        [username]
      )
      if (!result.length || !result[0].values.length) {
        return { success: false, error: 'Invalid username or password' }
      }
      const row = result[0]
      const [id, uname, hash, fullName, email, role, status, createdAt, updatedAt] = row.values[0]
      const valid = await bcrypt.compare(password, hash as string)
      if (!valid) return { success: false, error: 'Invalid username or password' }

      const user = { id: id as number, username: uname as string, fullName: fullName as string, email: email as string | null, role: role as 'admin', status: status as 'active', createdAt: createdAt as string, updatedAt: updatedAt as string }
      setCurrentSession(user)

      // Update last_login
      db.run(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id])
      saveDatabase()

      writeAuditLog({ userId: user.id, module: 'auth', action: 'login', newValue: { username } })
      return { success: true, data: user }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('auth:logout', (_e) => {
    const user = getCurrentSession()
    if (user) writeAuditLog({ userId: user.id, module: 'auth', action: 'logout' })
    setCurrentSession(null)
    return { success: true }
  })

  ipcMain.handle('auth:getCurrentUser', () => {
    const user = getCurrentSession()
    return { success: true, data: user }
  })

  ipcMain.handle('auth:changePassword', async (_e, { currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    try {
      const user = getCurrentSession()
      if (!user) return { success: false, error: 'Not authenticated' }
      const db = getSqlJsDb()
      const r = db.exec(`SELECT password_hash FROM users WHERE id = ?`, [user.id])
      const hash = r[0]?.values[0][0] as string
      const valid = await bcrypt.compare(currentPassword, hash)
      if (!valid) return { success: false, error: 'Current password is incorrect' }
      const newHash = await bcrypt.hash(newPassword, 12)
      db.run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [newHash, user.id])
      saveDatabase()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
