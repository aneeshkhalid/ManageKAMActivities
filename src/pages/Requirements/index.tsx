import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, FileText, ChevronRight, Filter, ArrowRight } from 'lucide-react'
import { formatDate, priorityColor, statusColor, cn } from '../../lib/utils'

const STATUS_ORDER = ['identified','documented','under_review','estimation_pending','estimated','approval_pending','approved','sprint_planned','development','qa','uat','released','closed','rejected','deferred']

export default function RequirementsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [pipelineStats, setPipelineStats] = useState<Record<string, number>>({})

  useEffect(() => { load(); loadPipeline() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.requirements.getAll({ status: statusFilter || undefined })
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  async function loadPipeline() {
    const r = await window.api.requirements.getPipelineStats()
    if (r.success) setPipelineStats(r.data as Record<string, number>)
  }

  async function advance(id: number, currentStatus: string) {
    const TRANSITIONS: Record<string, string[]> = {
      identified: ['documented'], documented: ['under_review'], under_review: ['estimation_pending'],
      estimation_pending: ['estimated'], estimated: ['approval_pending'],
      approval_pending: ['approved', 'rejected', 'deferred'], approved: ['sprint_planned'],
      sprint_planned: ['development'], development: ['qa'], qa: ['uat'], uat: ['released'], released: ['closed'],
    }
    const next = TRANSITIONS[currentStatus]
    if (!next || next.length === 0) { toast.info('This requirement cannot advance further'); return }

    let to: string
    if (next.length === 1) {
      to = next[0]
    } else {
      // Multiple options — ask user
      const choice = window.prompt(`Choose next status:\n${next.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nType the status name:`)
      if (!choice || !next.includes(choice.trim())) { toast.info('Cancelled'); return }
      to = choice.trim()
    }

    const r = await window.api.requirements.advanceStatus(id, to)
    if (r.success) { toast.success(`✓ Status advanced → ${to.replace(/_/g, ' ')}`); load(); loadPipeline() }
    else toast.error(r.error ?? 'Failed to advance status')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Requirements</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track requirements through the approval pipeline</p>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {['identified','documented','under_review','estimation_pending','estimated','approval_pending','approved','sprint_planned','development','qa','uat','released','closed'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setTimeout(load, 50) }}
            className={cn('flex-shrink-0 text-center px-3 py-2 rounded-lg border transition-all text-xs',
              statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'
            )}>
            <div className="font-bold text-base">{pipelineStats[s] ?? 0}</div>
            <div className="capitalize leading-tight mt-0.5" style={{ fontSize: 10 }}>{s.replace(/_/g,' ')}</div>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Ref','Title','Institute','Priority','Status','Action'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono font-bold text-indigo-600">{row.req_ref as string}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/requirements/${row.id}`)} className="text-sm font-medium text-slate-800 dark:text-white hover:text-blue-600 text-left max-w-xs truncate block">
                      {row.title as string}
                    </button>
                    <p className="text-xs text-slate-500">{row.institute_name as string}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.institute_name as string}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded border', priorityColor(row.priority as string))}>{row.priority as string}</span></td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{(row.status as string).replace(/_/g,' ')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/requirements/${row.id}`)} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">Details <ChevronRight className="w-3 h-3" /></button>
                      <button onClick={() => advance(row.id as number, row.status as string)} className="text-xs text-green-600 hover:underline flex items-center gap-0.5">Advance <ArrowRight className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No requirements found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
