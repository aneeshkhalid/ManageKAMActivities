import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let sqlite: Database.Database | null = null

export function initDatabase(): void {
  const dataDir = join(process.cwd(), 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  const dbPath = join(dataDir, 'ceim.db')
  sqlite = new Database(dbPath)
  // Enable WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const { runMigrations } = require('./migrate')
  runMigrations(sqlite)
  console.log(`[DB] Database ready at ${dbPath}`)
}

export function getSqlite(): Database.Database {
  if (!sqlite) throw new Error('Database not initialized. Call initDatabase() first.')
  return sqlite
}
