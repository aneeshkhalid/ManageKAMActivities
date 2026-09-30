import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { PlusCircle, Calendar, Building2, MapPin, Package, Users, FileText, CheckSquare, BookOpen, AlertTriangle, Wrench, RotateCcw, MessageSquare, Paperclip } from 'lucide-react'
import { formatDate, formatDateTime, statusColor, cn, today } from '../../lib/utils'
import { useAuthStore } from '../../store/auth.store'
import AttachmentsPanel from '../../components/AttachmentsPanel'
import ActivityDetailDrawer from '../../components/ActivityDetailDrawer'

// ─── Type config ──────────────────────────────────────────────
const ACTIVITY_TYPES = [
  { value: 'institute_visit', label: 'Institute Visit', icon: '🏫', color: 'bg-blue-50 border-blue-200 text-blue-800', description: 'Visit, audit walkthrough, or stakeholder meeting at institute' },
  { value: 'training_session', label: 'Training Session', icon: '📚', color: 'bg-purple-50 border-purple-200 text-purple-800', description: 'Conducted training, demo, or knowledge transfer' },
  { value: 'benchmark_audit', label: 'Benchmark Audit', icon: '🔍', color: 'bg-emerald-50 border-emerald-200 text-emerald-800', description: 'Module usage and adoption audit' },
  { value: 'issue_identified', label: 'Issue Identified', icon: '⚠️', color: 'bg-red-50 border-red-200 text-red-800', description: 'Bug, defect, or functional issue found' },
  { value: 'requirement_captured', label: 'Requirement Captured', icon: '📋', color: 'bg-indigo-50 border-indigo-200 text-indigo-800', description: 'New feature or improvement requirement' },
  { value: 'pain_area_identified', label: 'Pain Area Identified', icon: '😟', color: 'bg-orange-50 border-orange-200 text-orange-800', description: 'User/operational pain point or challenge' },
  { value: 'leadership_meeting', label: 'Leadership Meeting', icon: '👔', color: 'bg-slate-50 border-slate-200 text-slate-800', description: 'Discussion with leadership or management' },
  { value: 'action_created', label: 'Action Created', icon: '✅', color: 'bg-teal-50 border-teal-200 text-teal-800', description: 'Task or follow-up action to track' },
  { value: 'implementation_update', label: 'Implementation Update', icon: '🔧', color: 'bg-yellow-50 border-yellow-200 text-yellow-800', description: 'Progress update on ongoing implementation' },
  { value: 'follow_up', label: 'Follow-up', icon: '🔄', color: 'bg-pink-50 border-pink-200 text-pink-800', description: 'Follow-up on previous activity or commitment' },
  { value: 'support', label: 'Support', icon: '🛠️', color: 'bg-cyan-50 border-cyan-200 text-cyan-800', description: 'Technical support or troubleshooting' },
  { value: 'other', label: 'Other', icon: '📝', color: 'bg-gray-50 border-gray-200 text-gray-800', description: 'Any other activity' },
]

// ─── API helpers ──────────────────────────────────────────────
async function fetchInstitutes() {
  const r = await window.api.institutes.getAll()
  return r.success ? (r.data as { id: number; name: string; code: string }[]) : []
}
async function fetchLocations(instituteId: number) {
  const r = await window.api.locations.getByInstitute(instituteId)
  return r.success ? (r.data as { id: number; name: string }[]) : []
}
async function fetchModules() {
  const r = await window.api.modules.getAll()
  return r.success ? (r.data as { id: number; name: string; code: string }[]) : []
}
async function fetchDepartments(instituteId: number) {
  const r = await window.api.departments.getByInstitute(instituteId)
  return r.success ? (r.data as { id: number; name: string }[]) : []
}

export default function DailyLog() {
  const user = useAuthStore(s => s.user)
  const [selectedDate, setSelectedDate] = useState(today())
  const [activityType, setActivityType] = useState('')
  const [todayActivities, setTodayActivities] = useState<Record<string, unknown>[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [lastSavedId, setLastSavedId] = useState<number | null>(null)
  const [viewingId, setViewingId] = useState<number | null>(null)

  // Master data
  const [institutes, setInstitutes] = useState<{ id: number; name: string; code: string }[]>([])
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([])
  const [modules, setModules] = useState<{ id: number; name: string; code: string }[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])

  // Main form fields
  const [instituteId, setInstituteId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [moduleId, setModuleId] = useState('')
  const [deptId, setDeptId] = useState('')
  const [description, setDescription] = useState('')
  const [peopleMet, setPeopleMet] = useState('')
  const [findings, setFindings] = useState('')
  const [remarks, setRemarks] = useState('')
  const [actionRequired, setActionRequired] = useState('')
  const [dueDate, setDueDate] = useState('')

  // Sub-data per activity type
  const [subData, setSubData] = useState<Record<string, unknown>>({})
  const sub = (key: string, val: unknown) => setSubData(p => ({ ...p, [key]: val }))

  useEffect(() => { fetchInstitutes().then(setInstitutes) }, [])
  useEffect(() => { fetchModules().then(setModules) }, [])
  useEffect(() => { loadActivities() }, [selectedDate])

  useEffect(() => {
    if (instituteId) {
      fetchLocations(Number(instituteId)).then(setLocations)
      fetchDepartments(Number(instituteId)).then(setDepartments)
      setLocationId('')
    }
  }, [instituteId])

  async function loadActivities() {
    setLoadingActivities(true)
    const r = await window.api.activities.getByDate(selectedDate)
    setTodayActivities(r.success ? (r.data as Record<string, unknown>[]) : [])
    setLoadingActivities(false)
  }

  function resetForm() {
    setActivityType('')
    setInstituteId('')
    setLocationId('')
    setModuleId('')
    setDeptId('')
    setDescription('')
    setPeopleMet('')
    setFindings('')
    setRemarks('')
    setActionRequired('')
    setDueDate('')
    setSubData({})
    setLastSavedId(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activityType) { toast.error('Please select an activity type'); return }
    if (!description.trim()) { toast.error('Please enter a description'); return }
    if (!instituteId) { toast.error('Please select an institute'); return }

    setSubmitting(true)
    try {
      const payload = {
        date: selectedDate,
        instituteId: Number(instituteId) || null,
        locationId: Number(locationId) || null,
        moduleId: Number(moduleId) || null,
        deptId: Number(deptId) || null,
        activityType,
        description,
        peopleMet,
        findings,
        remarks,
        actionRequired,
        dueDate: dueDate || null,
        subData,
      }
      const result = await window.api.activities.create(payload)
      if (result.success) {
        const newId = result.data?.id as number
        setLastSavedId(newId)
        toast.success(`✅ Activity saved! ${result.data?.relatedType ? `→ ${result.data.relatedType} #${result.data.relatedId} created` : ''} — you can now attach files below.`)
        loadActivities()
      } else {
        toast.error(result.error ?? 'Failed to save activity')
      }
    } catch (err) {
      toast.error('Unexpected error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedType = ACTIVITY_TYPES.find(t => t.value === activityType)

  return (
    <>
    <ActivityDetailDrawer
      activityId={viewingId}
      onClose={() => setViewingId(null)}
      onUpdated={loadActivities}
    />
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Daily Activity Log</h1>
          <p className="text-slate-500 text-sm mt-0.5">Log your daily activities — data auto-routes to the correct module</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        {/* ─── ENTRY FORM ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" /> New Activity Entry
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Activity Type - PROMINENT */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Activity Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {ACTIVITY_TYPES.map(type => (
                  <button key={type.value} type="button"
                    onClick={() => { setActivityType(type.value); setSubData({}) }}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-xs font-medium transition-all text-center cursor-pointer',
                      activityType === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600'
                    )}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <span className="leading-tight">{type.label}</span>
                  </button>
                ))}
              </div>
              {selectedType && (
                <p className="mt-2 text-xs text-slate-500 italic">{selectedType.description}</p>
              )}
            </div>

            {/* Row: Institute + Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  <Building2 className="inline w-3.5 h-3.5 mr-1" />Institute <span className="text-red-500">*</span>
                </label>
                <select value={instituteId} onChange={e => setInstituteId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select institute…</option>
                  {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  <MapPin className="inline w-3.5 h-3.5 mr-1" />Location / Branch
                </label>
                <select value={locationId} onChange={e => setLocationId(e.target.value)}
                  disabled={!instituteId}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                  <option value="">Select location…</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {/* People Met */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                <Users className="inline w-3.5 h-3.5 mr-1" />People Met / Participants
              </label>
              <input value={peopleMet} onChange={e => setPeopleMet(e.target.value)}
                placeholder="e.g. IT Manager, Finance Head, Principal…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                <FileText className="inline w-3.5 h-3.5 mr-1" />Description / Summary <span className="text-red-500">*</span>
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Brief description of the activity…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* ─── DYNAMIC FIELDS BY ACTIVITY TYPE ─────────────────── */}
            {activityType === 'institute_visit' && (
              <DynamicFields label="Visit Details" color="blue">
                <Field label="Purpose of Visit *">
                  <textarea rows={2} placeholder="What was the main purpose?" onChange={e => sub('purpose', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Modules Discussed">
                  <input placeholder="e.g. BM Finance, WFM, Canteen…" onChange={e => sub('modulesDiscussed', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Findings">
                  <textarea rows={2} placeholder="Key observations and findings…" onChange={e => sub('findings', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Pain Areas Noted">
                  <textarea rows={2} placeholder="Challenges or pain areas mentioned…" onChange={e => sub('painAreasNoted', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Training Required">
                  <input placeholder="Any training needs identified…" onChange={e => sub('trainingRequired', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Next Visit Date">
                  <input type="date" onChange={e => sub('nextVisitDate', e.target.value)} className={inputCls} />
                </Field>
              </DynamicFields>
            )}

            {activityType === 'training_session' && (
              <DynamicFields label="Training Details" color="purple">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Module">
                    <select onChange={e => sub('moduleId', e.target.value)} className={inputCls}>
                      <option value="">Select module…</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Training Type">
                    <select onChange={e => sub('trainingType', e.target.value)} className={inputCls}>
                      <option value="group">Group</option>
                      <option value="new_user">New User Onboarding</option>
                      <option value="brush_up">Brush-up / Refresher</option>
                      <option value="one_on_one">One-on-One</option>
                      <option value="demo">Demo / Walkthrough</option>
                    </select>
                  </Field>
                </div>
                <Field label="Topic *">
                  <input placeholder="Training topic…" onChange={e => sub('topic', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Trainer">
                    <input placeholder="Trainer name" onChange={e => sub('trainer', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Expected Count">
                    <input type="number" placeholder="0" onChange={e => sub('participantCount', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Actual Attended">
                    <input type="number" placeholder="0" onChange={e => sub('actualAttendance', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <Field label="Duration (hours)">
                  <input type="number" step="0.5" placeholder="e.g. 2.5" onChange={e => sub('durationHours', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Feedback / Outcome">
                  <textarea rows={2} placeholder="Participant feedback, outcomes…" onChange={e => sub('feedback', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Issues Raised">
                  <textarea rows={2} placeholder="Any issues raised during training…" onChange={e => sub('issuesRaised', e.target.value)} className={inputCls} />
                </Field>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="followUp" onChange={e => sub('followUpRequired', e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                  <label htmlFor="followUp" className="text-sm text-slate-600 dark:text-slate-400">Follow-up session required</label>
                </div>
              </DynamicFields>
            )}

            {activityType === 'benchmark_audit' && (
              <DynamicFields label="Audit Details" color="emerald">
                <Field label="Module *">
                  <select value={moduleId} onChange={e => { setModuleId(e.target.value); sub('moduleId', e.target.value) }} className={inputCls}>
                    <option value="">Select module…</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Usage Status *">
                    <select onChange={e => sub('usageStatus', e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option value="fully_used">✅ Fully Used</option>
                      <option value="partially_used">⚠️ Partially Used</option>
                      <option value="not_used">❌ Not Used</option>
                      <option value="not_applicable">— Not Applicable</option>
                    </select>
                  </Field>
                  <Field label="User Adoption *">
                    <select onChange={e => sub('userAdoption', e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option value="high">🟢 High (80%+)</option>
                      <option value="medium">🟡 Medium (40-80%)</option>
                      <option value="low">🔴 Low (&lt;40%)</option>
                      <option value="none">⚫ None</option>
                    </select>
                  </Field>
                  <Field label="Data Quality *">
                    <select onChange={e => sub('dataQuality', e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option value="good">✅ Good</option>
                      <option value="needs_improvement">⚠️ Needs Improvement</option>
                      <option value="poor">❌ Poor</option>
                    </select>
                  </Field>
                  <Field label="Training Status *">
                    <select onChange={e => sub('trainingStatus', e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      <option value="trained">✅ Fully Trained</option>
                      <option value="partially_trained">⚠️ Partially Trained</option>
                      <option value="not_trained">❌ Not Trained</option>
                    </select>
                  </Field>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="w-4 h-4 rounded" onChange={e => sub('hasIssues', e.target.checked)} /> Issues Found</label>
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="w-4 h-4 rounded" onChange={e => sub('hasRequirements', e.target.checked)} /> Requirements Identified</label>
                </div>
                <Field label="Recommendation">
                  <textarea rows={2} placeholder="Recommendations for improvement…" onChange={e => sub('recommendation', e.target.value)} className={inputCls} />
                </Field>
              </DynamicFields>
            )}

            {activityType === 'issue_identified' && (
              <DynamicFields label="Issue Details" color="red">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <select onChange={e => sub('category', e.target.value)} className={inputCls}>
                      <option value="functional">Functional</option>
                      <option value="technical">Technical</option>
                      <option value="integration">Integration</option>
                      <option value="data">Data Quality</option>
                      <option value="performance">Performance</option>
                      <option value="ui_ux">UI/UX</option>
                      <option value="access">Access/Permissions</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select onChange={e => sub('priority', e.target.value)} className={inputCls}>
                      <option value="medium">Medium</option>
                      <option value="critical">🔴 Critical</option>
                      <option value="high">🟠 High</option>
                      <option value="low">🔵 Low</option>
                    </select>
                  </Field>
                </div>
                <Field label="Module">
                  <select onChange={e => sub('moduleId', e.target.value)} className={inputCls}>
                    <option value="">Select module…</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
                <Field label="Impact">
                  <textarea rows={2} placeholder="Business impact of this issue…" onChange={e => sub('impact', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Root Cause (if known)">
                  <input placeholder="Root cause analysis…" onChange={e => sub('rootCause', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Workaround">
                  <input placeholder="Existing workaround (if any)…" onChange={e => sub('workaround', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Assigned To">
                    <input placeholder="Team or person" onChange={e => sub('assignedTo', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Target Date">
                    <input type="date" onChange={e => sub('targetDate', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </DynamicFields>
            )}

            {activityType === 'requirement_captured' && (
              <DynamicFields label="Requirement Details" color="indigo">
                <Field label="Title *">
                  <input placeholder="Short, descriptive title…" onChange={e => sub('title', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Module">
                    <select onChange={e => sub('moduleId', e.target.value)} className={inputCls}>
                      <option value="">Select module…</option>
                      {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Department">
                    <select onChange={e => sub('deptId', e.target.value)} className={inputCls}>
                      <option value="">Select dept…</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Description *">
                  <textarea rows={3} placeholder="Detailed requirement description…" onChange={e => sub('description', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Business Need">
                  <textarea rows={2} placeholder="Why is this needed?" onChange={e => sub('businessNeed', e.target.value)} className={inputCls} />
                </Field>
                <Field label="User Impact">
                  <input placeholder="Who is affected and how?" onChange={e => sub('userImpact', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Business Impact">
                  <input placeholder="Business consequences if not addressed…" onChange={e => sub('businessImpact', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Priority">
                    <select onChange={e => sub('priority', e.target.value)} className={inputCls}>
                      <option value="medium">Medium</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                    </select>
                  </Field>
                  <Field label="Source">
                    <select onChange={e => sub('source', e.target.value)} className={inputCls}>
                      <option value="direct">Direct (from user)</option>
                      <option value="visit">Institute Visit</option>
                      <option value="training">Training Session</option>
                      <option value="audit">Usage Audit</option>
                      <option value="meeting">Leadership Meeting</option>
                    </select>
                  </Field>
                </div>
                <Field label="Requested By">
                  <input placeholder="Name and role of requestor…" onChange={e => sub('requestedBy', e.target.value)} className={inputCls} />
                </Field>
              </DynamicFields>
            )}

            {activityType === 'pain_area_identified' && (
              <DynamicFields label="Pain Area Details" color="orange">
                <Field label="Module">
                  <select onChange={e => sub('moduleId', e.target.value)} className={inputCls}>
                    <option value="">Select module…</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </Field>
                <Field label="Pain Description *">
                  <textarea rows={3} placeholder="Describe the pain area in detail…" onChange={e => sub('description', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Severity">
                    <select onChange={e => sub('severity', e.target.value)} className={inputCls}>
                      <option value="medium">Medium</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                    </select>
                  </Field>
                  <Field label="Frequency">
                    <select onChange={e => sub('frequency', e.target.value)} className={inputCls}>
                      <option value="always">Always</option>
                      <option value="often">Often</option>
                      <option value="sometimes">Sometimes</option>
                      <option value="rarely">Rarely</option>
                    </select>
                  </Field>
                </div>
                <Field label="Business Impact">
                  <textarea rows={2} placeholder="How is this affecting operations?" onChange={e => sub('businessImpact', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Existing Workaround">
                  <input placeholder="Current workaround being used…" onChange={e => sub('existingWorkaround', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Suggested Solution">
                  <textarea rows={2} placeholder="Proposed solution or improvement…" onChange={e => sub('suggestedSolution', e.target.value)} className={inputCls} />
                </Field>
              </DynamicFields>
            )}

            {activityType === 'leadership_meeting' && (
              <DynamicFields label="Meeting Details" color="slate">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <select onChange={e => sub('category', e.target.value)} className={inputCls}>
                      <option value="benchmark_adoption">Benchmark Adoption</option>
                      <option value="implementation">Implementation</option>
                      <option value="requirements">Requirements</option>
                      <option value="escalation">Escalation</option>
                      <option value="strategy">Strategy</option>
                      <option value="review">Review</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="Organization">
                    <input placeholder="Client organization…" onChange={e => sub('organization', e.target.value)} className={inputCls} />
                  </Field>
                </div>
                <Field label="Topic *">
                  <input placeholder="Meeting topic…" onChange={e => sub('topic', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Discussion Points">
                  <textarea rows={3} placeholder="Key discussion points…" onChange={e => sub('discussion', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Decisions Made">
                  <textarea rows={2} placeholder="Decisions reached…" onChange={e => sub('decisions', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Requirements Identified">
                  <textarea rows={2} placeholder="New requirements identified in this meeting…" onChange={e => sub('requirementsIdentified', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Action Items">
                  <textarea rows={2} placeholder="Actions committed in this meeting…" onChange={e => sub('actionItems', e.target.value)} className={inputCls} />
                </Field>
                <Field label="Follow-up Date">
                  <input type="date" onChange={e => sub('followUpDate', e.target.value)} className={inputCls} />
                </Field>
              </DynamicFields>
            )}

            {activityType === 'action_created' && (
              <DynamicFields label="Action Details" color="teal">
                <Field label="Action Description *">
                  <textarea rows={3} placeholder="What needs to be done?" onChange={e => sub('description', e.target.value)} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Owner / Assigned To">
                    <input placeholder="Person responsible…" onChange={e => sub('owner', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Priority">
                    <select onChange={e => sub('priority', e.target.value)} className={inputCls}>
                      <option value="medium">Medium</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                    </select>
                  </Field>
                </div>
                <Field label="Due Date">
                  <input type="date" onChange={e => sub('dueDate', e.target.value)} className={inputCls} />
                </Field>
              </DynamicFields>
            )}

            {/* Findings (common) */}
            {activityType && !['institute_visit', 'training_session'].includes(activityType) && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Findings / Notes</label>
                <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={2}
                  placeholder="Additional findings or notes…"
                  className={inputCls}
                />
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                <MessageSquare className="inline w-3.5 h-3.5 mr-1" />Remarks / Additional Notes
              </label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                placeholder="Any additional remarks…"
                className={inputCls}
              />
            </div>

            {/* ─── ATTACHMENTS ──────────────────────────────────────── */}
            {activityType && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Attachments <span className="text-slate-400 font-normal">(optional)</span>
                  </span>
                </div>
                {lastSavedId ? (
                  <AttachmentsPanel relatedType="daily_activity" relatedId={lastSavedId} />
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50 p-4 text-center">
                    <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Save the activity first, then attach files here</p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              {!lastSavedId ? (
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2">
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                    : <><PlusCircle className="w-4 h-4" /> Save Activity</>
                  }
                </button>
              ) : (
                <button type="button" onClick={resetForm}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2">
                  <PlusCircle className="w-4 h-4" /> Log Another Activity
                </button>
              )}
              <button type="button" onClick={resetForm}
                className="px-4 py-2.5 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 bg-white rounded-lg text-sm transition"
                title="Reset form">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* ─── TODAY'S LOG ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit max-h-[calc(100vh-12rem)] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              {selectedDate === today() ? "Today's Log" : `Log for ${formatDate(selectedDate)}`}
              <span className="ml-auto text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {todayActivities.length} entries
              </span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {loadingActivities ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
            ) : todayActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <BookOpen className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No activities logged yet</p>
                <p className="text-xs mt-1">Select a type and fill the form to start</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {todayActivities.map(act => {
                  const typeInfo = ACTIVITY_TYPES.find(t => t.value === act.activity_type as string)
                  return (
                    <div key={act.id as number} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{typeInfo?.icon ?? '📝'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{typeInfo?.label ?? act.activity_type as string}</span>
                                {act.related_type && (
                                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded">
                                    → {act.related_type as string} #{act.related_id as number}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{act.description as string}</p>
                              {act.institute_name && (
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" /> {act.institute_name as string}
                                  {act.location_name && <span> · {act.location_name as string}</span>}
                                </p>
                              )}
                            </div>
                            {/* View/Edit button */}
                            <button
                              onClick={() => setViewingId(act.id as number)}
                              className="shrink-0 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded px-2 py-1 transition font-medium"
                              title="View / Edit this activity"
                            >
                              <Paperclip className="w-3 h-3" />
                              View
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1.5">{formatDateTime(act.created_at as string)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────
const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'

function DynamicFields({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800',
    purple: 'border-purple-200 bg-purple-50/50 dark:bg-purple-950/30 dark:border-purple-800',
    emerald: 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-800',
    red: 'border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-800',
    indigo: 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-800',
    orange: 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/30 dark:border-orange-800',
    slate: 'border-slate-200 bg-slate-50/50 dark:bg-slate-700/30 dark:border-slate-600',
    teal: 'border-teal-200 bg-teal-50/50 dark:bg-teal-950/30 dark:border-teal-800',
  }
  return (
    <div className={cn('rounded-xl border-2 p-4 space-y-3', colors[color] ?? colors.slate)}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
