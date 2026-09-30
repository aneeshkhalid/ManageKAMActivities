import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth } from '../middleware/auth'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const app = new Hono()
app.use('*', requireAuth)

const getBackupDir = () => {
  const dir = join(process.cwd(), 'data', 'backups')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

app.post('/create', async (c) => {
  try {
    const db = getSqlite()
    const backupDir = getBackupDir()
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `ceim-backup-${ts}.db`
    const backupPath = join(backupDir, filename)
    await (db as unknown as { backup(path: string): Promise<void> }).backup(backupPath)
    return c.json({ success: true, data: { filename } })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/list', (c) => {
  try {
    const backupDir = getBackupDir()
    const files = readdirSync(backupDir).filter(f => f.endsWith('.db')).map(f => ({ name: f }))
    return c.json({ success: true, data: files })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/download/:filename', (c) => {
  try {
    const backupDir = getBackupDir()
    const filename = c.req.param('filename')
    const filePath = join(backupDir, filename)
    if (!existsSync(filePath)) return c.json({ success: false, error: 'File not found' }, 404)
    const data = readFileSync(filePath)
    c.header('Content-Type', 'application/octet-stream')
    c.header('Content-Disposition', `attachment; filename="${filename}"`)
    return c.body(data.buffer as ArrayBuffer)
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
