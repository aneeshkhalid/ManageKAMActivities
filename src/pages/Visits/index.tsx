import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Building, MapPin, Filter, ChevronRight } from 'lucide-react'
import { formatDate, statusColor, cn } from '../../lib/utils'

export default function VisitsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [filterInstitute, setFilterInstitute] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ visitDate: new Date().toISOString().split('T')[0], instituteId: '', locationId: '', purpose: '', participants: '', findings: '', painAreasNoted: '', trainingRequired: '', nextVisitDate: '', remarks: '', status: 'Completed' })
  const [locations, setLocations] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.institutes.getAll().then(r => { if (r.success) setInstitutes(r.data as Record<string, unknown>[]) })
    load()
  }, [])

  useEffect(() => {
    if (form.instituteId) window.api.locations.getByInstitute(Number(form.instituteId)).then(r => { if (r.success) setLocations(r.data as Record<string, unknown>[]) })
  }, [form.instituteId])

  async function load() {
    setLoading(true)
    const r = await window.api.visits.getAll({ instituteId: filterInstitute ? Number(filterInstitute) : undefined })
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.instituteId || !form.purpose) { toast.error('Institute and Purpose are required'); return }
    setSaving(true)
    const r = await window.api.visits.create({ ...form, instituteId: Number(form.instituteId), locationId: form.locationId ? Number(form.locationId) : null })
    if (r.success) { toast.success('Visit logged'); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Institute Visits</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track all client institute visits</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> Log Visit</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Visit Date</label><input type="date" value={form.visitDate} onChange={e => setForm(f => ({...f, visitDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Institute *</label>
              <select value={form.instituteId} onChange={e => setForm(f => ({...f, instituteId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
              <select value={form.locationId} onChange={e => setForm(f => ({...f, locationId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{locations.map(l => <option key={l.id as number} value={l.id as number}>{l.name as string}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Purpose *</label><input value={form.purpose} onChange={e => setForm(f => ({...f, purpose: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Participants</label><input value={form.participants} onChange={e => setForm(f => ({...f, participants: e.target.value}))} placeholder="Names/roles" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Planned</option><option>Completed</option><option>Rescheduled</option><option>Cancelled</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Findings</label><textarea value={form.findings} onChange={e => setForm(f => ({...f, findings: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Log Visit'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <select value={filterInstitute} onChange={e => { setFilterInstitute(e.target.value); load() }} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Institutes</option>
          {institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Date','Institute','Location','Purpose','Participants','Status'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-white">{formatDate(row.visit_date as string)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.institute_name as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{row.location_name as string ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{row.purpose as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-[140px] truncate">{row.participants as string ?? '—'}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No visits found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
