import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Clock, Trash2 } from 'lucide-react'
import { formatDate, statusColor, cn } from '../../../lib/utils'

export default function PendingModulesPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [modules, setModules] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({ instituteId: '', moduleId: '', currentStatus: '', reasonPending: '', dependency: '', actionRequired: '', owner: '', targetDate: '', escalationRequired: false, remarks: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([window.api.institutes.getAll(), window.api.modules.getAll()]).then(([ir, mr]) => {
      if (ir.success) setInstitutes(ir.data as Record<string, unknown>[])
      if (mr.success) setModules(mr.data as Record<string, unknown>[])
    })
    load()
  }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.pendingModules.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.instituteId || !form.moduleId) { toast.error('Institute and Module required'); return }
    setSaving(true)
    const r = await window.api.pendingModules.create({ ...form, instituteId: Number(form.instituteId), moduleId: Number(form.moduleId) })
    if (r.success) { toast.success('Pending module logged'); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Remove this pending module record?')) return
    await window.api.pendingModules.delete(id); toast.success('Removed'); load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pending Modules</h1>
          <p className="text-slate-500 text-sm mt-0.5">Modules not yet implemented or activated at institutes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> Log Pending Module</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Institute *</label>
              <select value={form.instituteId} onChange={e => setForm(f => ({...f, instituteId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Module *</label>
              <select value={form.moduleId} onChange={e => setForm(f => ({...f, moduleId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{modules.map(m => <option key={m.id as number} value={m.id as number}>{m.name as string}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Current Status</label><input value={form.currentStatus} onChange={e => setForm(f => ({...f, currentStatus: e.target.value}))} placeholder="e.g. Not configured" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Reason Pending</label><input value={form.reasonPending} onChange={e => setForm(f => ({...f, reasonPending: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Action Required</label><input value={form.actionRequired} onChange={e => setForm(f => ({...f, actionRequired: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Owner</label><input value={form.owner} onChange={e => setForm(f => ({...f, owner: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Target Date</label><input type="date" value={form.targetDate} onChange={e => setForm(f => ({...f, targetDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="flex items-center gap-2 mt-5"><input type="checkbox" id="esc" checked={form.escalationRequired} onChange={e => setForm(f => ({...f, escalationRequired: e.target.checked}))} className="w-4 h-4 rounded border-slate-300" /><label htmlFor="esc" className="text-sm text-slate-600">Escalation Required</label></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Log'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Institute','Module','Reason','Action Required','Owner','Target Date','Escalation','Status','Del'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-white">{row.institute_name as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.module_name as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[140px] truncate">{row.reason_pending as string ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[140px] truncate">{row.action_required as string ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{row.owner as string ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.target_date as string)}</td>
                  <td className="px-4 py-3">{row.escalation_required ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Yes</span> : <span className="text-xs text-slate-300">No</span>}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(row.id as number)} className="text-slate-400 hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No pending modules found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
