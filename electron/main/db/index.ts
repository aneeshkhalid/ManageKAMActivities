import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import log from 'electron-log'
import * as schema from './schema'
import { runMigrations } from './migrate'
import { seedDatabase } from './seed'

let db: ReturnType<typeof drizzle>
let sqlJsDb: SqlJsDatabase
let dbFilePath: string

// ─── Database path ────────────────────────────────────────────
function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  return join(dbDir, 'ceim.db')
}

// ─── Save DB to disk (sql.js stores in memory, we persist manually) ──
export function saveDatabase(): void {
  if (sqlJsDb && dbFilePath) {
    try {
      const data = sqlJsDb.export()
      writeFileSync(dbFilePath, Buffer.from(data))
    } catch (error) {
      log.error('Failed to save database to disk:', error)
    }
  }
}

// ─── Initialize database ──────────────────────────────────────
export async function initDatabase(): Promise<void> {
  dbFilePath = getDbPath()
  log.info(`Database path: ${dbFilePath}`)

  const isNew = !existsSync(dbFilePath)

  // Initialize sql.js (WASM-based SQLite – no native compilation needed)
  const SQL = await initSqlJs()

  if (isNew) {
    log.info('Creating new database...')
    sqlJsDb = new SQL.Database()
  } else {
    log.info('Loading existing database from disk...')
    const fileBuffer = readFileSync(dbFilePath)
    sqlJsDb = new SQL.Database(fileBuffer)
  }

  // Create Drizzle ORM wrapper
  db = drizzle(sqlJsDb, { schema, logger: false })

  // Run migrations (creates all tables)
  await runMigrations(sqlJsDb)

  // Persist after migrations
  saveDatabase()

  // Seed with sample data on first run
  if (isNew) {
    log.info('New database – seeding sample data...')
    await seedDatabase(db)
    saveDatabase()
    log.info('Sample data seeded and saved successfully')
  }

  // Auto-save every 30 seconds to prevent data loss
  setInterval(() => {
    saveDatabase()
  }, 30_000)
}

// ─── Get database instance ────────────────────────────────────
export function getDb(): ReturnType<typeof drizzle> {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

// ─── Get raw sql.js instance (for migrations/backup) ─────────
export function getSqlJsDb(): SqlJsDatabase {
  if (!sqlJsDb) throw new Error('sql.js not initialized.')
  return sqlJsDb
}

// ─── Close database ───────────────────────────────────────────
export function closeDatabase(): void {
  if (sqlJsDb) {
    saveDatabase()
    sqlJsDb.close()
    log.info('Database connection closed')
  }
}

// ─── Execute raw SQL ──────────────────────────────────────────
export function execSql(sql: string, params?: (string | number | null | Uint8Array)[]): void {
  if (params) {
    sqlJsDb.run(sql, params)
  } else {
    sqlJsDb.run(sql)
  }
}

// ─── Query raw SQL ────────────────────────────────────────────
export function querySql(sql: string, params?: (string | number | null | Uint8Array)[]): Record<string, unknown>[] {
  const result = sqlJsDb.exec(sql, params)
  if (!result.length) return []
  const { columns, values } = result[0]
  return values.map((row) =>
    Object.fromEntries(columns.map((col, i) => [col, row[i]]))
  )
}

// Re-export schema for convenience
export { schema }
