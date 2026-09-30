import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Briefcase, Trash2 } from 'lucide-react'
import { formatDate, statusColor, cn } from '../../lib/utils'

export default function MeetingsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [form, setForm] = useState({ meetingDate: new Date().toISOString().split('T')[0], instituteId: '', organization: '', attendees: '', topic: '', category: 'review', discussion: '', decisions: '', requirementsIdentified: '', actionItems: '', followUpDate: '', status: 'completed' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.institutes.getAll().then(r => { if (r.success) setInstitutes(r.data as Record<string, unknown>[]) })
    load()
  }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.meetings.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.topic || !form.instituteId) { toast.error('Topic and Institute required'); return }
    setSaving(true)
    const r = await window.api.meetings.create({ ...form, instituteId: Number(form.instituteId), followUpDate: form.followUpDate || null })
    if (r.success) { toast.success('Meeting logged'); setShowForm(false); load() } else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this meeting record?')) return
    await window.api.meetings.delete(id); toast.success('Deleted'); load()
  }

  const categoryColors: Record<string, string> = {
    benchmark_adoption: 'bg-blue-100 text-blue-700',
    implementation: 'bg-yellow-100 text-yellow-800',
    requirements: 'bg-indigo-100 text-indigo-700',
    escalation: 'bg-red-100 text-red-700',
    strategy: 'bg-purple-100 text-purple-700',
    review: 'bg-slate-100 text-slate-700',
    other: 'bg-gray-100 text-gray-600',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Leadership Meetings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Meetings with institute leadership and management</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"><Plus className="w-4 h-4" /> Log Meeting</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-5 shadow-sm">
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Date</label><input type="date" value={form.meetingDate} onChange={e => setForm(f => ({...f, meetingDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Institute *</label>
              <select value={form.instituteId} onChange={e => setForm(f => ({...f, instituteId: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>{institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Topic *</label><input value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Organization</label><input value={form.organization} onChange={e => setForm(f => ({...f, organization: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Attendees</label><input value={form.attendees} onChange={e => setForm(f => ({...f, attendees: e.target.value}))} placeholder="Names/roles" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3"><label className="block text-xs font-medium text-slate-600 mb-1">Discussion Points</label><textarea value={form.discussion} onChange={e => setForm(f => ({...f, discussion: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Decisions Made</label><textarea value={form.decisions} onChange={e => setForm(f => ({...f, decisions: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Action Items</label><textarea value={form.actionItems} onChange={e => setForm(f => ({...f, actionItems: e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Follow-up Date</label><input type="date" value={form.followUpDate} onChange={e => setForm(f => ({...f, followUpDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Log Meeting'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)
        ) : data.map(row => (
          <div key={row.id as number} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <span className="text-xs font-medium text-slate-500">{formatDate(row.meeting_date as string)}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded', categoryColors[row.category as string] ?? 'bg-gray-100 text-gray-600')}>{(row.category as string)?.replace(/_/g,' ')}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span>
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white">{row.topic as string}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{row.institute_name as string}{row.organization ? ` · ${row.organization}` : ''}</p>
                {row.attendees && <p className="text-xs text-slate-400 mt-1">👤 {row.attendees as string}</p>}
                {row.decisions && <p className="text-xs text-slate-500 mt-2 line-clamp-1">📌 Decisions: {row.decisions as string}</p>}
                {row.action_items && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">✅ Actions: {row.action_items as string}</p>}
              </div>
              <button onClick={() => handleDelete(row.id as number)} className="text-slate-400 hover:text-red-600 transition ml-3 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!loading && data.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No meetings logged yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
