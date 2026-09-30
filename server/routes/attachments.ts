import { Hono } from 'hono'
import { getSqlite } from '../db'
import { requireAuth, getUser } from '../middleware/auth'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const app = new Hono()
app.use('*', requireAuth)

const getAttachDir = (relatedType: string, relatedId: string) => {
  const dir = join(process.cwd(), 'data', 'attachments', relatedType, relatedId)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

app.post('/upload', async (c) => {
  try {
    const user = getUser(c)
    const relatedType = c.req.query('relatedType') ?? 'general'
    const relatedId = c.req.query('relatedId') ?? '0'
    const body = await c.req.parseBody({ all: true })
    const rawFiles = body['files']
    const files = Array.isArray(rawFiles) ? rawFiles : rawFiles ? [rawFiles] : []
    const db = getSqlite()
    const uploaded: { id: number | bigint; originalName: string }[] = []
    for (const file of files) {
      if (!file || typeof file === 'string') continue
      const f = file as File
      const bytes = await f.arrayBuffer()
      const storedName = `${Date.now()}-${f.name}`
      const attDir = getAttachDir(relatedType, relatedId)
      const dest = join(attDir, storedName)
      writeFileSync(dest, Buffer.from(bytes))
      const r = db.prepare(`INSERT INTO attachments (related_type,related_id,file_name,file_path,uploaded_by) VALUES (?,?,?,?,?)`)
        .run(relatedType, relatedId, f.name, dest, user.id)
      uploaded.push({ id: r.lastInsertRowid, originalName: f.name })
    }
    return c.json({ success: true, data: uploaded })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.get('/', (c) => {
  try {
    const relatedType = c.req.query('relatedType')
    const relatedId = c.req.query('relatedId')
    const rows = getSqlite().prepare(`SELECT * FROM attachments WHERE related_type=? AND related_id=? ORDER BY created_at DESC`).all(relatedType, relatedId)
    return c.json({ success: true, data: rows })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

app.delete('/:id', (c) => {
  try {
    getSqlite().prepare(`DELETE FROM attachments WHERE id=?`).run(c.req.param('id'))
    return c.json({ success: true })
  } catch (err) { return c.json({ success: false, error: (err as Error).message }) }
})

export default app
