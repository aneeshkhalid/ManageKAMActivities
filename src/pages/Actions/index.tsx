import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, CheckSquare, Clock, AlertTriangle, Check } from 'lucide-react'
import { formatDate, priorityColor, statusColor, isOverdue, cn, today } from '../../lib/utils'

export default function ActionsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({ description: '', owner: '', priority: 'medium', dueDate: '', instituteId: '', sourceType: 'manual' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.institutes.getAll().then(r => { if (r.success) setInstitutes(r.data as Record<string, unknown>[]) })
    load()
  }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.actions.getAll({ status: statusFilter || undefined })
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description) { toast.error('Description required'); return }
    setSaving(true)
    const r = await window.api.actions.create({ ...form, instituteId: form.instituteId ? Number(form.instituteId) : null, dueDate: form.dueDate || null })
    if (r.success) { toast.success(`Action ${r.data?.actionRef} created`); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  async function complete(id: number) {
    const remarks = prompt('Completion remarks (optional):') ?? ''
    await window.api.actions.complete({ id, remarks })
    toast.success('Action completed')
    load()
  }

  const overdue = data.filter(a => isOverdue(a.due_date as string) && !['completed','cancelled'].includes(a.status as string)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Action Tracker</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track and follow up on all actions and commitments</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> New Action</button>
      </div>

      {overdue > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">{overdue} overdue action(s) require immediate attention</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Description *</label><textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Owner</label><input value={form.owner} onChange={e => setForm(f => ({...f, owner: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['critical','high','medium','low'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Institute</label>
              <select value={form.instituteId} onChange={e => setForm(f => ({...f, instituteId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Create Action'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[['','All'],['open','Open'],['in_progress','In Progress'],['overdue','Overdue'],['completed','Completed']].map(([v, l]) => (
          <button key={v} onClick={() => { setStatusFilter(v); setTimeout(load, 50) }}
            className={cn('px-3 py-1.5 rounded-lg text-sm border transition', statusFilter === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Ref','Description','Institute','Owner','Priority','Due Date','Status','Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className={cn('transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30', isOverdue(row.due_date as string) && !['completed','cancelled'].includes(row.status as string) && 'bg-red-50/30 dark:bg-red-950/10')}>
                  <td className="px-4 py-3 text-xs font-mono text-teal-600 font-bold">{row.action_ref as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">{row.description as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.institute_name as string ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.owner as string ?? '—'}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded border', priorityColor(row.priority as string))}>{row.priority as string}</span></td>
                  <td className={cn('px-4 py-3 text-sm', isOverdue(row.due_date as string) && !['completed','cancelled'].includes(row.status as string) ? 'text-red-600 font-medium' : 'text-slate-600')}>
                    {formatDate(row.due_date as string)}
                  </td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                  <td className="px-4 py-3">
                    {!['completed','cancelled'].includes(row.status as string) && (
                      <button onClick={() => complete(row.id as number)} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                        <Check className="w-3.5 h-3.5" /> Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">No actions found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
