import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Plus, Filter } from 'lucide-react'
import { formatDate, priorityColor, statusColor, cn } from '../../lib/utils'

export default function IssuesPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [modules, setModules] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({ issueDate: new Date().toISOString().split('T')[0], instituteId: '', moduleId: '', description: '', category: 'functional', priority: 'medium', impact: '', assignedTo: '', targetDate: '' })
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
    const r = await window.api.issues.getAll({ status: status || undefined, priority: priority || undefined })
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.instituteId) { toast.error('Description and Institute are required'); return }
    setSaving(true)
    const r = await window.api.issues.create({ ...form, instituteId: Number(form.instituteId), moduleId: form.moduleId ? Number(form.moduleId) : null })
    if (r.success) { toast.success(`Issue ${r.data?.issueRef} created`); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  async function changeStatus(id: number, newStatus: string) {
    let resolution = ''
    if (newStatus === 'resolved') { resolution = prompt('Resolution summary:') ?? '' }
    await window.api.issues.changeStatus({ id, status: newStatus, resolution })
    toast.success('Status updated')
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Issues</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track and manage all identified issues</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> New Issue</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Date</label><input type="date" value={form.issueDate} onChange={e => setForm(f => ({...f, issueDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Institute *</label>
              <select value={form.instituteId} onChange={e => setForm(f => ({...f, instituteId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Module</label>
              <select value={form.moduleId} onChange={e => setForm(f => ({...f, moduleId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{modules.map(m => <option key={m.id as number} value={m.id as number}>{m.name as string}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['functional','technical','integration','data','performance','ui_ux','access','other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['critical','high','medium','low'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Assigned To</label><input value={form.assignedTo} onChange={e => setForm(f => ({...f, assignedTo: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Description *</label><textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Create Issue'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        {[['status','Status',['','open','in_progress','resolved','closed']],['priority','Priority',['','critical','high','medium','low']]].map(([key, label, opts]) => (
          <select key={key as string} value={key === 'status' ? status : priority}
            onChange={e => { key === 'status' ? setStatus(e.target.value) : setPriority(e.target.value); setTimeout(load, 50) }}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {(opts as string[]).map(o => <option key={o} value={o}>{o || `All ${label}es`}</option>)}
          </select>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Ref','Date','Institute','Module','Description','Priority','Status','Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono font-bold text-blue-600">{row.issue_ref as string}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.issue_date as string)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.institute_name as string}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.module_name as string ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">{row.description as string}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded border', priorityColor(row.priority as string))}>{row.priority as string}</span></td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                  <td className="px-4 py-3">
                    {row.status === 'open' && <button onClick={() => changeStatus(row.id as number, 'in_progress')} className="text-xs text-blue-600 hover:underline">Start</button>}
                    {row.status === 'in_progress' && <button onClick={() => changeStatus(row.id as number, 'resolved')} className="text-xs text-green-600 hover:underline">Resolve</button>}
                    {row.status === 'resolved' && <button onClick={() => changeStatus(row.id as number, 'closed')} className="text-xs text-slate-500 hover:underline">Close</button>}
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">No issues found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
