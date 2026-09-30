import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { formatDate, ragColor, ragDot, cn } from '../../lib/utils'

export default function AuditsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRag, setFilterRag] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.audits.getAll({ ragStatus: filterRag || undefined })
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Benchmark Usage Audit</h1>
        <p className="text-slate-500 text-sm mt-0.5">Module usage and adoption audits across institutes</p>
      </div>

      <div className="flex gap-2 mb-4">
        {['','green','amber','red'].map(r => (
          <button key={r} onClick={() => { setFilterRag(r); setTimeout(load, 50) }}
            className={cn('px-3 py-1.5 rounded-lg text-sm border transition',
              filterRag === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}>
            {r === '' ? 'All' : <span className="flex items-center gap-2"><span className={cn('w-3 h-3 rounded-full', ragDot(r))} />{r.charAt(0).toUpperCase()+r.slice(1)}</span>}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Date','Institute','Module','Usage','Adoption','Data Quality','Training','Score','RAG'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.audit_date as string)}</td>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-white">{row.institute_name as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.module_name as string}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{(row.usage_status as string)?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.user_adoption as string}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{(row.data_quality as string)?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{(row.training_status as string)?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300">{(row.overall_score as number)?.toFixed(0) ?? '—'}%</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1.5 w-fit', ragColor(row.rag_status as string))}>
                      <span className={cn('w-2 h-2 rounded-full', ragDot(row.rag_status as string))} />
                      {(row.rag_status as string)?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">No audits found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
