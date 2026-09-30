import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { AlertTriangle, TrendingUp, CheckCircle, Clock, Shield, Building2, BookOpen, FileText, Wrench, Users, Activity, Star, Target } from 'lucide-react'
import { cn, formatDate, assignmentProgress, ragDot, statusColor } from '../../lib/utils'

interface KPIs {
  totalInstitutes: number; institutesVisited: number; locationsCovered: number; modulesAudited: number
  benchmarkAdoptionPct: number; trainingSessions: number; totalParticipantsTrained: number
  openIssues: number; openRequirements: number; requirementsAwaitingApproval: number
  activeImplementations: number; pendingModulesCount: number
  openActions: number; overdueActions: number; openRisks: number; criticalRisks: number
  visitsSinceStart: number; openPainAreas: number
}

function KpiCard({ label, value, sub, icon: Icon, color = 'blue', danger = false, onClick }: {
  label: string; value: number | string; sub?: string; icon: React.ElementType; color?: string; danger?: boolean; onClick?: () => void
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    slate: 'bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  }
  return (
    <div onClick={onClick} className={cn('bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm transition-all', onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5', danger && 'border-red-200 dark:border-red-800')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={cn('text-2xl font-bold mt-1', danger ? 'text-red-600' : 'text-slate-800 dark:text-white')}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colors[color] ?? colors.blue)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [attentionItems, setAttentionItems] = useState<Record<string, unknown>[]>([])
  const [myWork, setMyWork] = useState<Record<string, unknown>>({})
  const [engagement, setEngagement] = useState<Record<string, unknown>[]>([])
  const [pipeline, setPipeline] = useState<{ status: string; count: number }[]>([])
  const [monthlyTrend, setMonthlyTrend] = useState<Record<string, unknown>[]>([])
  const [assignment, setAssignment] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [kpiR, attR, myR, engR, pipeR, trendR, assR] = await Promise.all([
      window.api.dashboard.getKPIs(),
      window.api.dashboard.getAttentionItems(),
      window.api.dashboard.getMyWorkToday(),
      window.api.dashboard.getInstituteEngagement(),
      window.api.dashboard.getRequirementPipeline(),
      window.api.dashboard.getMonthlyTrend(),
      window.api.assignments.getCurrent(),
    ])
    if (kpiR.success) setKpis(kpiR.data as KPIs)
    if (attR.success) setAttentionItems(attR.data as Record<string, unknown>[])
    if (myR.success) setMyWork(myR.data as Record<string, unknown>)
    if (engR.success) setEngagement(engR.data as Record<string, unknown>[])
    if (pipeR.success) setPipeline(pipeR.data as { status: string; count: number }[])
    if (trendR.success) setMonthlyTrend(trendR.data as Record<string, unknown>[])
    if (assR.success) setAssignment(assR.data as Record<string, unknown>)
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    </div>
  )

  const asmProgress = assignment
    ? assignmentProgress(assignment.start_date as string, assignment.end_date as string)
    : 0

  return (
    <div className="space-y-6">
      {/* Assignment Banner */}
      {assignment && (
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Active Assignment</p>
              <h2 className="text-xl font-bold">{assignment.name as string}</h2>
              <p className="text-blue-200 text-sm mt-1">
                {formatDate(assignment.start_date as string)} → {formatDate(assignment.end_date as string)}
                &nbsp;·&nbsp;{asmProgress}% elapsed
              </p>
            </div>
            <div className="text-right">
              <div className="w-40">
                <p className="text-blue-200 text-xs mb-1">Assignment Progress</p>
                <div className="w-full h-2 bg-blue-600/50 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${asmProgress}%` }} />
                </div>
                <p className="text-white font-bold text-lg mt-1">{asmProgress}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      {kpis && (
        <>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">📊 Institute & Engagement</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <KpiCard label="Total Institutes" value={kpis.totalInstitutes} icon={Building2} color="blue" />
              <KpiCard label="Institutes Visited" value={kpis.institutesVisited} sub={`of ${kpis.totalInstitutes}`} icon={Target} color="green" onClick={() => navigate('/visits')} />
              <KpiCard label="Locations Covered" value={kpis.locationsCovered} icon={Activity} color="blue" />
              <KpiCard label="Benchmark Adoption" value={`${kpis.benchmarkAdoptionPct}%`} icon={TrendingUp} color={kpis.benchmarkAdoptionPct >= 70 ? 'green' : kpis.benchmarkAdoptionPct >= 40 ? 'amber' : 'red'} onClick={() => navigate('/audits/adoption')} />
              <KpiCard label="Modules Audited" value={kpis.modulesAudited} icon={CheckCircle} color="green" onClick={() => navigate('/audits')} />
              <KpiCard label="Training Sessions" value={kpis.trainingSessions} sub={`${kpis.totalParticipantsTrained} participants`} icon={BookOpen} color="purple" onClick={() => navigate('/training')} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">⚡ Open Items</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <KpiCard label="Open Issues" value={kpis.openIssues} icon={AlertTriangle} color={kpis.openIssues > 10 ? 'red' : 'amber'} onClick={() => navigate('/issues')} />
              <KpiCard label="Open Requirements" value={kpis.openRequirements} icon={FileText} color="blue" onClick={() => navigate('/requirements')} />
              <KpiCard label="Awaiting Approval" value={kpis.requirementsAwaitingApproval} icon={Star} color="amber" danger={kpis.requirementsAwaitingApproval > 0} onClick={() => navigate('/requirements')} />
              <KpiCard label="Active Implementations" value={kpis.activeImplementations} icon={Wrench} color="purple" onClick={() => navigate('/implementations')} />
              <KpiCard label="Open Actions" value={kpis.openActions} sub={kpis.overdueActions > 0 ? `⚠️ ${kpis.overdueActions} overdue` : undefined} icon={CheckCircle} color={kpis.overdueActions > 0 ? 'red' : 'green'} danger={kpis.overdueActions > 0} onClick={() => navigate('/actions')} />
              <KpiCard label="Open Risks" value={kpis.openRisks} sub={kpis.criticalRisks > 0 ? `🔴 ${kpis.criticalRisks} critical` : undefined} icon={Shield} color={kpis.criticalRisks > 0 ? 'red' : 'amber'} danger={kpis.criticalRisks > 0} onClick={() => navigate('/risks')} />
            </div>
          </div>
        </>
      )}

      {/* Attention Required */}
      {attentionItems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Attention Required ({attentionItems.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {attentionItems.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white dark:bg-slate-800 rounded-lg p-3 border border-red-100 dark:border-red-900">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.title as string}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.detail as string}</p>
                  {item.institute && <p className="text-xs text-slate-400 mt-0.5">📍 {item.institute as string}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Institute Engagement */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Institute Engagement</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={engagement.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="visits" fill="#3b82f6" name="Visits" radius={[4,4,0,0]} />
              <Bar dataKey="trainings" fill="#8b5cf6" name="Training" radius={[4,4,0,0]} />
              <Bar dataKey="issues" fill="#f59e0b" name="Issues" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">6-Month Activity Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="visits" stroke="#3b82f6" dot={false} name="Visits" />
              <Line type="monotone" dataKey="trainings" stroke="#8b5cf6" dot={false} name="Training" />
              <Line type="monotone" dataKey="issues" stroke="#f59e0b" dot={false} name="Issues" />
              <Line type="monotone" dataKey="requirements" stroke="#10b981" dot={false} name="Requirements" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Requirement Pipeline */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Requirements Pipeline</h3>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
          {pipeline.filter(s => s.count > 0).map(stage => (
            <div key={stage.status} className="text-center">
              <div className={cn('text-xl font-bold mb-1', stage.count > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-300')}>
                {stage.count}
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wide leading-tight">
                {stage.status.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Work Today */}
      {(myWork.visits || myWork.meetings || myWork.actions) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Today's Schedule
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['visits','meetings','trainings','actions'] as const).map(key => {
              const items = (myWork[key] as Record<string, unknown>[] | undefined) ?? []
              if (!items.length) return null
              const icons = { visits: '🏫', meetings: '👔', trainings: '📚', actions: '✅' }
              const labels = { visits: 'Visits', meetings: 'Meetings', trainings: 'Training', actions: 'Actions Due' }
              return (
                <div key={key} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{icons[key]} {labels[key]}</p>
                  {items.slice(0, 3).map((item, i) => (
                    <p key={i} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {(item.purpose ?? item.topic ?? item.description ?? item.name) as string ?? '—'}
                    </p>
                  ))}
                  {items.length > 3 && <p className="text-xs text-blue-600 mt-1">+{items.length - 3} more</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
