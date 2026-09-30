import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { HardDrive, RotateCcw, Download, FolderOpen, Clock, AlertTriangle } from 'lucide-react'
import { formatDateTime } from '../../lib/utils'

export default function BackupRestorePage() {
  const [backups, setBackups] = useState<Record<string, unknown>[]>([])
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => { loadBackups() }, [])

  async function loadBackups() {
    const r = await window.api.backup.listBackups()
    if (r.success) setBackups(r.data as Record<string, unknown>[])
  }

  async function createBackup() {
    setCreating(true)
    const r = await window.api.backup.create()
    if (r.success) { toast.success(`✅ Backup created: ${r.data?.filename}`); loadBackups() }
    else toast.error(r.error ?? 'Backup failed')
    setCreating(false)
  }

  async function restoreBackup() {
    if (!confirm('⚠️ Restore will overwrite current data. Ensure you have a recent backup. Continue?')) return
    setRestoring(true)
    const r = await window.api.backup.selectRestoreFile()
    if (!r.success || !r.data?.filePath) { setRestoring(false); return }
    toast.warning('Restore initiated. App will restart after restore completes.')
    setRestoring(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Backup &amp; Restore</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage database backups and restoration</p>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Important: Restore Overwrites All Data</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Always create a backup before restoring. Restoration cannot be undone.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">Create Backup</h3>
              <p className="text-xs text-slate-500">Save current data to a backup file</p>
            </div>
          </div>
          <button onClick={createBackup} disabled={creating}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
            <Download className="w-4 h-4" /> {creating ? 'Creating…' : 'Create Backup Now'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">Restore from Backup</h3>
              <p className="text-xs text-slate-500">Restore data from a backup file</p>
            </div>
          </div>
          <button onClick={restoreBackup} disabled={restoring}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
            <FolderOpen className="w-4 h-4" /> {restoring ? 'Selecting…' : 'Select & Restore Backup'}
          </button>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Backup History ({backups.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {backups.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400">
              <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No backups found. Create your first backup above.</p>
            </div>
          ) : backups.map((b, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-white">{b.filename as string}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(b.createdAt as string)} · {((b.size as number) / 1024).toFixed(1)} KB</p>
              </div>
              <HardDrive className="w-4 h-4 text-slate-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
