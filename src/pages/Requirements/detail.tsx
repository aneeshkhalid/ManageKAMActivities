import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, statusColor, priorityColor, cn } from '../../lib/utils'

export default function RequirementDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')
  const [advanceTo, setAdvanceTo] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    const r = await window.api.requirements.getById(Number(id))
    if (r.success) setData(r.data as Record<string, unknown>)
    setLoading(false)
  }

  async function advance(e: React.FormEvent) {
    e.preventDefault()
    if (!advanceTo) { toast.error('Select target status'); return }
    setSaving(true)
    const r = await window.api.requirements.advanceStatus({ id: Number(id), toStatus: advanceTo, notes })
    if (r.success) { toast.success(`Status → ${advanceTo}`); setAdvanceTo(''); setNotes(''); load() }
    else toast.error(r.error ?? 'Invalid transition')
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
  if (!data) return <div className="text-center py-20 text-slate-400"><p>Requirement not found</p></div>

  const history = (data.history ?? []) as Record<string, unknown>[]

  const statusOptions: Record<string, string[]> = {
    identified: ['documented'], documented: ['under_review'], under_review: ['estimation_pending'],
    estimation_pending: ['estimated'], estimated: ['approval_pending'],
    approval_pending: ['approved', 'rejected', 'deferred'], approved: ['sprint_planned'],
    sprint_planned: ['development'], development: ['qa'], qa: ['uat'], uat: ['released'], released: ['closed'],
  }

  const nextOptions = statusOptions[data.status as string] ?? []

  return (
    <div>
      <button onClick={() => navigate('/requirements')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"><ArrowLeft className="w-4 h-4" /> Back</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono font-bold text-indigo-600 text-lg">{data.req_ref as string}</span>
            <span className={cn('text-xs px-2 py-1 rounded', priorityColor(data.priority as string))}>{data.priority as string}</span>
            <span className={cn('text-sm px-2 py-1 rounded', statusColor(data.status as string))}>{(data.status as string).replace(/_/g, ' ')}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{data.title as string}</h1>
          <p className="text-slate-500 text-sm">{data.institute_name as string}</p>
        </div>
      </div>

      {/* Advance Status */}
      {nextOptions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">Advance Status</h3>
          <form onSubmit={advance} className="flex gap-3 flex-wrap">
            <select value={advanceTo} onChange={e => setAdvanceTo(e.target.value)} className="border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Move to…</option>
              {nextOptions.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)…" className="flex-1 min-w-48 border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Advance'}</button>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-5">
        {['details','description','history','estimation','approval'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium capitalize transition', tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[['Ref', data.req_ref], ['Institute', data.institute_name], ['Module', data.module_name ?? '—'], ['Department', data.department_name ?? '—'], ['Date Identified', formatDate(data.date_identified as string)], ['Priority', data.priority], ['Source', data.source], ['Requested By', data.requested_by ?? '—'], ['Portfolio Manager', data.portfolio_manager ?? '—']].map(([k, v]) => (
            <div key={k as string} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">{k as string}</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{v as string ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'description' && (
        <div className="space-y-4">
          {[['Description', data.description], ['Business Need', data.business_need], ['User Impact', data.user_impact], ['Business Impact', data.business_impact], ['Remarks', data.remarks]].map(([k, v]) => (
            v ? <div key={k as string} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{k as string}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{v as string}</p>
            </div> : null
          ))}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? <p className="text-slate-400 text-sm text-center py-8">No history</p> : history.map((h, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {h.from_status && <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(h.from_status as string))}>{h.from_status as string}</span>}
                  {h.from_status && <span className="text-slate-400 text-xs">→</span>}
                  <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(h.to_status as string))}>{h.to_status as string}</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDate(h.changed_at as string)}</span>
                </div>
                {h.notes && <p className="text-xs text-slate-500 mt-1">{h.notes as string}</p>}
                {h.changed_by && <p className="text-xs text-slate-400 mt-0.5">by {h.changed_by as string}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'estimation' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          {data.estimation ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[['Complexity', (data.estimation as Record<string,unknown>).technical_complexity], ['Dev Effort (days)', (data.estimation as Record<string,unknown>).dev_effort_days], ['QA Effort (days)', (data.estimation as Record<string,unknown>).qa_effort_days], ['Sprint', (data.estimation as Record<string,unknown>).estimated_sprint], ['Release Date', formatDate((data.estimation as Record<string,unknown>).estimated_release_date as string)], ['Estimator', (data.estimation as Record<string,unknown>).estimator]].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-xs text-slate-400 mb-1">{k as string}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{v as string ?? '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No estimation added yet. Advance to estimation_pending first.</p>
          )}
        </div>
      )}

      {tab === 'approval' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          {data.approval ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(data.approval as Record<string,unknown>).filter(([k]) => !['id','requirement_id','created_at','updated_at'].includes(k)).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-slate-400 mb-1">{k.replace(/_/g,' ')}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{String(v ?? '—')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">No approval record yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
