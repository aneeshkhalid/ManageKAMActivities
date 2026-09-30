import { useState, useEffect } from 'react'
import { Search, Filter } from 'lucide-react'
import { formatDateTime } from '../../lib/utils'

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.auditLogs.getAll({ action: action || undefined, search: search || undefined })
    if (r.success) setLogs(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  const actionColors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    LOGIN: 'bg-purple-100 text-purple-700',
    LOGOUT: 'bg-slate-100 text-slate-600',
    ADVANCE: 'bg-indigo-100 text-indigo-700',
    EXPORT: 'bg-teal-100 text-teal-700',
    BACKUP: 'bg-amber-100 text-amber-700',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-0.5">All system activity and data changes</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search logs…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={action} onChange={e => { setAction(e.target.value); setTimeout(load, 50) }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Actions</option>
          {Object.keys(actionColors).map(a => <option key={a}>{a}</option>)}
        </select>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">Search</button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Time','User','Action','Entity','Record ID','Details'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at as string)}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">{log.username as string ?? 'System'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${actionColors[log.action as string] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action as string}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400">{log.entity_type as string}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">{log.entity_id as number ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">{log.details as string ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No audit logs found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
