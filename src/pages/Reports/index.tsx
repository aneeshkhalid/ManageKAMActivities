import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, BarChart3 } from 'lucide-react'
import { today } from '../../lib/utils'

const REPORT_TYPES = [
  { value: 'weekly_summary', label: '📋 Weekly Summary', desc: 'Activities, visits, and actions for the week' },
  { value: 'monthly_summary', label: '📊 Monthly Summary', desc: 'Full month activity and KPI report' },
  { value: 'institute_engagement', label: '🏫 Institute Engagement', desc: 'Visit, training, issue and requirement counts per institute' },
  { value: 'benchmark_adoption', label: '🔍 Benchmark Adoption', desc: 'Module usage and adoption status across institutes' },
  { value: 'requirement_pipeline', label: '📋 Requirement Pipeline', desc: 'All requirements by status with timeline' },
  { value: 'issue_log', label: '⚠️ Issue Log', desc: 'All issues with status and resolution' },
  { value: 'training_report', label: '📚 Training Report', desc: 'Training sessions, participants and coverage' },
  { value: 'action_tracker', label: '✅ Action Tracker', desc: 'All actions and completion status' },
  { value: 'risk_register', label: '🛡️ Risk Register', desc: 'Risks with scores, levels and mitigations' },
  { value: 'implementation_status', label: '🔧 Implementation Status', desc: 'Implementation progress and task completion' },
]

export default function ReportsPage() {
  const [reportType, setReportType] = useState('weekly_summary')
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(today())
  const [filterInstitute, setFilterInstitute] = useState('')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  async function generatePreview() {
    setGenerating(true)
    const r = await window.api.reports.getData({ reportType, dateFrom, dateTo, instituteId: filterInstitute ? Number(filterInstitute) : undefined })
    if (r.success) { setPreview(r.data as Record<string, unknown>); toast.success('Report data loaded') }
    else toast.error(r.error ?? 'Failed to load report')
    setGenerating(false)
  }

  async function exportExcel() {
    setGenerating(true)
    const r = await window.api.reports.generateExcel({ reportType, dateFrom, dateTo, instituteId: filterInstitute ? Number(filterInstitute) : undefined })
    if (r.success) toast.success(`✅ Report saved: ${r.data?.filePath ?? 'Check Downloads'}`)
    else toast.error(r.error ?? 'Export failed')
    setGenerating(false)
  }

  const selectedType = REPORT_TYPES.find(t => t.value === reportType)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">Generate and export management reports</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Config panel */}
        <div className="space-y-5">
          {/* Report type selector */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Select Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {REPORT_TYPES.map(rt => (
                <button key={rt.value} onClick={() => setReportType(rt.value)}
                  className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all ${reportType === rt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 bg-white dark:bg-slate-700'}`}>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{rt.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Filters</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Action panel */}
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Generate Report</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{selectedType?.desc}</p>
            <div className="space-y-3">
              <button onClick={generatePreview} disabled={generating}
                className="w-full py-2.5 border-2 border-blue-500 text-blue-600 font-semibold rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 transition flex items-center justify-center gap-2 disabled:opacity-60">
                <BarChart3 className="w-4 h-4" />
                {generating ? 'Loading…' : 'Preview Data'}
              </button>
              <button onClick={exportExcel} disabled={generating}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-60">
                <FileSpreadsheet className="w-4 h-4" />
                {generating ? 'Exporting…' : 'Export to Excel'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">Reports are saved to your Downloads folder</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Preview — {selectedType?.label}</h3>
          </div>
          <div className="p-5 overflow-auto max-h-[500px] scrollbar-thin">
            <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
