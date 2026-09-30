import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Building2, MapPin, FileText, AlertTriangle, GraduationCap, BarChart3 } from 'lucide-react'
import { formatDate, statusColor, cn } from '../../../lib/utils'

export default function InstituteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [institute, setInstitute] = useState<Record<string, unknown> | null>(null)
  const [stats, setStats] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    if (!id) return
    Promise.all([
      window.api.institutes.getById(Number(id)),
      window.api.institutes.getStats(Number(id)),
    ]).then(([r1, r2]) => {
      if (r1.success) setInstitute(r1.data as Record<string, unknown>)
      if (r2.success) setStats(r2.data as Record<string, unknown>)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
  if (!institute) return <div className="text-center py-20 text-slate-400"><p>Institute not found</p></div>

  return (
    <div>
      <button onClick={() => navigate('/master/institutes')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Institutes
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{institute.code as string}</span>
            <span className={cn('text-sm px-2 py-0.5 rounded', statusColor(institute.status as string))}>{institute.status as string}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mt-2">{institute.name as string}</h1>
          <p className="text-slate-500 text-sm">{institute.type as string}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          ['Visits', stats.visits, 'blue'],
          ['Audits', stats.audits, 'green'],
          ['Requirements', stats.requirements, 'indigo'],
          ['Issues', stats.issues, 'amber'],
          ['Training Sessions', stats.trainings, 'purple'],
        ].map(([label, val, color]) => (
          <div key={label as string} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{val as number ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label as string}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-5">
        {['overview','contact','notes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium capitalize transition', tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          {[['Name', institute.name], ['Code', institute.code], ['Type', institute.type], ['Status', institute.status], ['Organization', institute.org]].map(([k, v]) => (
            v && <div key={k as string} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">{k as string}</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{v as string}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'contact' && (
        <div className="grid grid-cols-2 gap-4">
          {[['Primary Contact', institute.primary_contact], ['Email', institute.email], ['Phone', institute.phone]].map(([k, v]) => (
            v && <div key={k as string} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">{k as string}</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{v as string}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">{institute.notes as string || 'No notes added.'}</p>
        </div>
      )}
    </div>
  )
}
