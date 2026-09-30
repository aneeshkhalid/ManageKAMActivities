import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ragColor, ragDot, cn } from '../../lib/utils'

export default function AdoptionDashboard() {
  const [matrix, setMatrix] = useState<{ institutes: Record<string,unknown>[]; modules: Record<string,unknown>[]; matrix: Record<string,Record<string,unknown>> }>({ institutes: [], modules: [], matrix: {} })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.audits.getAdoptionMatrix().then(r => {
      if (r.success) setMatrix(r.data as typeof matrix)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading adoption matrix…</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Adoption Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Module adoption matrix across all institutes</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-auto p-4">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 bg-slate-50 dark:bg-slate-700 sticky left-0 z-10 font-semibold text-slate-600 dark:text-slate-300 min-w-[160px]">Institute</th>
              {matrix.modules.map(m => (
                <th key={m.id as number} className="px-2 py-2 bg-slate-50 dark:bg-slate-700 font-semibold text-slate-600 dark:text-slate-300 text-center min-w-[80px]" title={m.name as string}>
                  <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', height: 80 }}>
                    {m.name as string}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {matrix.institutes.map(inst => (
              <tr key={inst.id as number} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 z-10">{inst.name as string}</td>
                {matrix.modules.map(mod => {
                  const cell = matrix.matrix?.[inst.id as number]?.[mod.id as number] as Record<string,unknown> | undefined
                  return (
                    <td key={mod.id as number} className="px-2 py-2 text-center">
                      {cell ? (
                        <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-bold',
                          cell.rag_status === 'green' ? 'bg-green-100 text-green-700' :
                          cell.rag_status === 'amber' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        )} title={`Adoption: ${cell.adoption_pct}%`}>
                          {cell.adoption_pct as number ?? 0}%
                        </span>
                      ) : <span className="text-slate-300 text-lg">—</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
          {[['green','≥70% — On Track'],['amber','40–69% — Needs Attention'],['red','<40% — Critical']].map(([rag, label]) => (
            <div key={rag} className="flex items-center gap-2 text-xs text-slate-500">
              <span className={cn('w-4 h-4 rounded-full', ragDot(rag))} />
              {label}
            </div>
          ))}
          <span className="text-slate-300 text-xl">—</span>
          <span className="text-xs text-slate-400">Not audited</span>
        </div>
      </div>
    </div>
  )
}
