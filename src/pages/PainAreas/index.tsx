import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'
import { formatDate, priorityColor, statusColor, cn } from '../../lib/utils'

export default function PainAreasPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [modules, setModules] = useState<Record<string, unknown>[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ dateIdentified: new Date().toISOString().split('T')[0], instituteId: '', moduleId: '', reportedBy: '', description: '', businessImpact: '', frequency: 'often', severity: 'medium', existingWorkaround: '', suggestedSolution: '' })
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
    const r = await window.api.painAreas.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.instituteId) { toast.error('Description and Institute required'); return }
    setSaving(true)
    const r = await window.api.painAreas.create({ ...form, instituteId: Number(form.instituteId), moduleId: form.moduleId ? Number(form.moduleId) : null })
    if (r.success) { toast.success('Pain area logged'); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this pain area?')) return
    await window.api.painAreas.delete(id); toast.success('Deleted'); load()
  }

  const severityColors: Record<string, string> = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    high: 'text-orange-700 bg-orange-50 border-orange-200',
    medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    low: 'text-blue-700 bg-blue-50 border-blue-200',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pain Areas</h1>
          <p className="text-slate-500 text-sm mt-0.5">User and operational pain points identified across institutes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> Log Pain Area</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Date</label><input type="date" value={form.dateIdentified} onChange={e => setForm(f => ({...f, dateIdentified: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
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
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Reported By</label><input value={form.reportedBy} onChange={e => setForm(f => ({...f, reportedBy: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['critical','high','medium','low'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm(f => ({...f, frequency: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['always','often','sometimes','rarely'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Description *</label><textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Business Impact</label><textarea value={form.businessImpact} onChange={e => setForm(f => ({...f, businessImpact: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Workaround</label><input value={form.existingWorkaround} onChange={e => setForm(f => ({...f, existingWorkaround: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Suggested Solution</label><input value={form.suggestedSolution} onChange={e => setForm(f => ({...f, suggestedSolution: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Log Pain Area'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [1,2,3].map(i => <div key={i} className="h-36 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />) : data.map(row => (
          <div key={row.id as number} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div className="flex gap-2 flex-wrap">
                <span className={cn('text-xs px-2 py-0.5 rounded border', severityColors[row.severity as string] ?? '')}>{row.severity as string}</span>
                <span className="text-xs text-slate-400">{row.frequency as string}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span>
              </div>
              <button onClick={() => handleDelete(row.id as number)} className="text-slate-400 hover:text-red-600 transition ml-2"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-white line-clamp-2 mb-2">{row.description as string}</p>
            <p className="text-xs text-slate-500">{row.institute_name as string}{row.module_name ? ` · ${row.module_name}` : ''}</p>
            {row.business_impact && <p className="text-xs text-slate-400 mt-1 line-clamp-1">Impact: {row.business_impact as string}</p>}
            <p className="text-xs text-slate-400 mt-2">{formatDate(row.date_identified as string)} · {row.reported_by as string ?? 'Unknown'}</p>
          </div>
        ))}
        {!loading && data.length === 0 && <div className="col-span-3 text-center py-20 text-slate-400 text-sm">No pain areas found</div>}
      </div>
    </div>
  )
}
