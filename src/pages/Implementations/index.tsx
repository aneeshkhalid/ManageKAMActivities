import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Wrench, ChevronRight } from 'lucide-react'
import { formatDate, statusColor, cn } from '../../lib/utils'

export default function ImplementationsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [modules, setModules] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({ projectName: '', implType: 'new_module', instituteId: '', moduleId: '', startDate: '', targetDate: '', owner: '', status: 'not_started' })
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
    const r = await window.api.implementations.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projectName || !form.instituteId) { toast.error('Project name and institute required'); return }
    setSaving(true)
    const r = await window.api.implementations.create({ ...form, instituteId: Number(form.instituteId), moduleId: form.moduleId ? Number(form.moduleId) : null })
    if (r.success) { toast.success(`${r.data?.implRef} created`); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  const statusColorMap: Record<string, string> = { not_started: 'bg-gray-100 text-gray-600', planning: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-800', blocked: 'bg-red-100 text-red-700', uat: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700', live: 'bg-emerald-100 text-emerald-700', on_hold: 'bg-gray-100 text-gray-500' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Implementations</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track module and system implementations</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> New Implementation</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Project Name *</label><input value={form.projectName} onChange={e => setForm(f => ({...f, projectName: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select value={form.implType} onChange={e => setForm(f => ({...f, implType: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['new_module','module_upgrade','configuration','integration','data_migration','other'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
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
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label><input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Target Date</label><input type="date" value={form.targetDate} onChange={e => setForm(f => ({...f, targetDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Owner</label><input value={form.owner} onChange={e => setForm(f => ({...f, owner: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />) : data.map(row => (
          <div key={row.id as number} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/implementations/${row.id}`)}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-mono font-bold text-blue-600">{row.impl_ref as string}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded', statusColorMap[row.status as string] ?? 'bg-gray-100 text-gray-600')}>{(row.status as string)?.replace(/_/g,' ')}</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">{row.project_name as string}</h3>
            <p className="text-xs text-slate-500">{row.institute_name as string} · {(row.impl_type as string)?.replace(/_/g,' ')}</p>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Progress</span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{row.progress_pct as number ?? 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${row.progress_pct as number ?? 0}%` }} />
              </div>
            </div>
            {row.target_date && <p className="text-xs text-slate-400 mt-2">Target: {formatDate(row.target_date as string)}</p>}
          </div>
        ))}
        {!loading && data.length === 0 && <div className="col-span-3 text-center py-20 text-slate-400 text-sm">No implementations found</div>}
      </div>
    </div>
  )
}
