import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, FileSpreadsheet, TrendingUp, Target, Building2 } from 'lucide-react'
import { formatDate, assignmentProgress } from '../../lib/utils'

export default function AssignmentOverview() {
  const [assignment, setAssignment] = useState<Record<string, unknown> | null>(null)
  const [kpis, setKpis] = useState<Record<string, unknown>>({})
  const [trend, setTrend] = useState<Record<string, unknown>[]>([])
  const [engagement, setEngagement] = useState<Record<string, unknown>[]>([])
  const [baselineMetrics, setBaselineMetrics] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      window.api.assignments.getCurrent(),
      window.api.dashboard.getKPIs(),
      window.api.dashboard.getMonthlyTrend(),
      window.api.dashboard.getInstituteEngagement(),
      window.api.reports.getBaselineMetrics(),
    ]).then(([ar, kr, tr, er, br]) => {
      if (ar.success) setAssignment(ar.data as Record<string, unknown>)
      if (kr.success) setKpis(kr.data as Record<string, unknown>)
      if (tr.success) setTrend(tr.data as Record<string, unknown>[])
      if (er.success) setEngagement(er.data as Record<string, unknown>[])
      if (br.success) setBaselineMetrics(br.data as Record<string, unknown>[])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>

  const progress = assignment ? assignmentProgress(assignment.start_date as string, assignment.end_date as string) : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Assignment Overview</h1>
        <p className="text-slate-500 text-sm mt-0.5">3-month UAE engagement summary and progress</p>
      </div>

      {/* Assignment Card */}
      {assignment && (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-xl p-6 text-white shadow-lg mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Assignment</p>
              <p className="font-bold text-lg">{assignment.name as string}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Period</p>
              <p className="font-medium">{formatDate(assignment.start_date as string)}</p>
              <p className="text-blue-200 text-xs">to {formatDate(assignment.end_date as string)}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Progress</p>
              <p className="font-bold text-3xl">{progress}%</p>
              <div className="w-full h-1.5 bg-blue-600/40 rounded-full mt-1">
                <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div>
              <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Status</p>
              <p className="font-bold capitalize">{assignment.status as string}</p>
              {assignment.portfolio_manager_name && <p className="text-blue-200 text-xs mt-1">{assignment.portfolio_manager_name as string}</p>}
            </div>
          </div>
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          ['Institutes', kpis.totalInstitutes, 'blue'],
          ['Visits Done', kpis.visitsSinceStart, 'green'],
          ['Trainings', kpis.trainingSessions, 'purple'],
          ['Issues', kpis.openIssues, 'amber'],
          ['Requirements', kpis.openRequirements, 'indigo'],
          ['Adoption %', `${kpis.benchmarkAdoptionPct}%`, 'emerald'],
        ].map(([label, val, color]) => (
          <div key={label as string} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{String(val ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label as string}</p>
          </div>
        ))}
      </div>

      {/* Baseline vs Current */}
      {baselineMetrics.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Baseline vs Current Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 uppercase">
                {['Metric','Institute','Baseline','Current','Change'].map(h => <th key={h} className="text-left py-2 pr-4">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {baselineMetrics.map((m, i) => {
                  const change = (m.current_value as number ?? 0) - (m.baseline_value as number ?? 0)
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300">{m.metric_name as string}</td>
                      <td className="py-2 pr-4 text-slate-500">{m.institute_name as string ?? 'All'}</td>
                      <td className="py-2 pr-4">{m.baseline_value as number ?? '—'}</td>
                      <td className="py-2 pr-4">{m.current_value as number ?? '—'}</td>
                      <td className={`py-2 pr-4 font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Monthly Activity Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="visits" fill="#3b82f6" name="Visits" radius={[3,3,0,0]} />
              <Bar dataKey="trainings" fill="#8b5cf6" name="Trainings" radius={[3,3,0,0]} />
              <Bar dataKey="issues" fill="#f59e0b" name="Issues" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Institute Engagement</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engagement.slice(0,6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} tickFormatter={v => v.length > 12 ? v.slice(0,12)+'…' : v} />
              <Tooltip />
              <Bar dataKey="visits" fill="#3b82f6" name="Visits" radius={[0,3,3,0]} />
              <Bar dataKey="issues" fill="#f59e0b" name="Issues" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
