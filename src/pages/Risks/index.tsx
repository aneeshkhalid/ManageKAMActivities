import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Shield, AlertTriangle } from 'lucide-react'
import { formatDate, statusColor, cn } from '../../lib/utils'

export default function RisksPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({ description: '', probability: '3', impact: '3', mitigation: '', owner: '', dueDate: '', instituteId: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.institutes.getAll().then(r => { if (r.success) setInstitutes(r.data as Record<string, unknown>[]) })
    load()
  }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.risks.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description) { toast.error('Description required'); return }
    setSaving(true)
    const r = await window.api.risks.create({ ...form, probability: Number(form.probability), impact: Number(form.impact), instituteId: form.instituteId ? Number(form.instituteId) : null, dueDate: form.dueDate || null })
    if (r.success) { toast.success(`Risk ${r.data?.riskRef} logged`); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  const levelColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const score = Number(form.probability) * Number(form.impact)
  const previewLevel = score >= 17 ? 'critical' : score >= 10 ? 'high' : score >= 5 ? 'medium' : 'low'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Risk Register</h1>
          <p className="text-slate-500 text-sm mt-0.5">Identify, assess and mitigate project risks</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> Log Risk</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Risk Description *</label><textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Probability (1-5)</label>
              <select value={form.probability} onChange={e => setForm(f => ({...f, probability: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['1','2','3','4','5'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Impact (1-5)</label>
              <select value={form.impact} onChange={e => setForm(f => ({...f, impact: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['1','2','3','4','5'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <div className={cn('px-3 py-2 rounded-lg border text-sm font-medium w-full text-center', levelColors[previewLevel])}>
                Score: {score} — {previewLevel.toUpperCase()}
              </div>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Owner</label><input value={form.owner} onChange={e => setForm(f => ({...f, owner: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Institute</label>
              <select value={form.instituteId} onChange={e => setForm(f => ({...f, instituteId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Mitigation Strategy</label><textarea value={form.mitigation} onChange={e => setForm(f => ({...f, mitigation: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Log Risk'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Ref','Description','Institute','Prob','Impact','Score','Level','Owner','Status'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono font-bold text-slate-500">{row.risk_ref as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">{row.description as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.institute_name as string ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-center">{row.probability as number}</td>
                  <td className="px-4 py-3 text-sm text-center">{row.impact as number}</td>
                  <td className="px-4 py-3 text-sm font-bold text-center">{row.risk_score as number}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded border', levelColors[row.risk_level as string] ?? '')}>{(row.risk_level as string)?.toUpperCase()}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.owner as string ?? '—'}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No risks found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
