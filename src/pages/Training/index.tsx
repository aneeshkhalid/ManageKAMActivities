import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, GraduationCap } from 'lucide-react'
import { formatDate, statusColor, cn } from '../../lib/utils'

export default function TrainingPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Record<string, unknown>>({})
  const [showForm, setShowForm] = useState(false)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [modules, setModules] = useState<Record<string, unknown>[]>([])
  const [locations, setLocations] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({ trainingDate: new Date().toISOString().split('T')[0], instituteId: '', locationId: '', moduleId: '', topic: '', trainer: '', targetAudience: '', participantCount: '', actualAttendance: '', durationHours: '', trainingType: 'group', status: 'Completed' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([window.api.institutes.getAll(), window.api.modules.getAll(), window.api.dashboard.getTrainingSummary()]).then(([ir, mr, sr]) => {
      if (ir.success) setInstitutes(ir.data as Record<string, unknown>[])
      if (mr.success) setModules(mr.data as Record<string, unknown>[])
      if (sr.success) setSummary(sr.data as Record<string, unknown>)
    })
    load()
  }, [])

  useEffect(() => {
    if (form.instituteId) window.api.locations.getByInstitute(Number(form.instituteId)).then(r => { if (r.success) setLocations(r.data as Record<string, unknown>[]) })
  }, [form.instituteId])

  async function load() {
    setLoading(true)
    const r = await window.api.training.getSessions()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic || !form.instituteId) { toast.error('Topic and Institute required'); return }
    setSaving(true)
    const r = await window.api.training.createSession({ ...form, instituteId: Number(form.instituteId), locationId: form.locationId ? Number(form.locationId) : null, moduleId: form.moduleId ? Number(form.moduleId) : null, participantCount: form.participantCount ? Number(form.participantCount) : null, actualAttendance: form.actualAttendance ? Number(form.actualAttendance) : null, durationHours: form.durationHours ? Number(form.durationHours) : null })
    if (r.success) { toast.success('Training session created'); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Training Sessions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Training and knowledge transfer activities</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> New Session</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[['Sessions', summary.totalSessions], ['Participants', summary.totalParticipants], ['Institutes', summary.institutesCovered], ['Modules', summary.modulesCovered], ['Hours', summary.totalHours]].map(([k, v]) => (
          <div key={k as string} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{String(v ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k as string}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Date</label><input type="date" value={form.trainingDate} onChange={e => setForm(f => ({...f, trainingDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
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
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Topic *</label><input value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Trainer</label><input value={form.trainer} onChange={e => setForm(f => ({...f, trainer: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select value={form.trainingType} onChange={e => setForm(f => ({...f, trainingType: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['group','new_user','brush_up','one_on_one','demo'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Expected</label><input type="number" value={form.participantCount} onChange={e => setForm(f => ({...f, participantCount: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Attended</label><input type="number" value={form.actualAttendance} onChange={e => setForm(f => ({...f, actualAttendance: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Duration (hrs)</label><input type="number" step="0.5" value={form.durationHours} onChange={e => setForm(f => ({...f, durationHours: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Create Session'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Date','Institute','Module','Topic','Type','Attended','Duration','Status'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer" onClick={() => navigate(`/training/${row.id}`)}>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.training_date as string)}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-white">{row.institute_name as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.module_name as string ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[160px] truncate">{row.topic as string}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{(row.training_type as string)?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.actual_attendance as number ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.duration_hours as number ?? '—'}h</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">No sessions found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
