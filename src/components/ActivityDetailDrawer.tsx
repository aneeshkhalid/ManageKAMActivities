/**
 * ActivityDetailDrawer — slide-in panel for viewing/editing any daily activity entry.
 * Supports inline editing of: description, findings, remarks, action required, owner, due date, status.
 * Includes full AttachmentsPanel for uploading/viewing files.
 */
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  X, Edit2, Save, Paperclip, Building2, MapPin, Package,
  Users, Calendar, Tag, Link2, AlertCircle, RotateCcw
} from 'lucide-react'
import { cn, formatDateTime } from '../lib/utils'
import AttachmentsPanel from './AttachmentsPanel'

const ACTIVITY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  institute_visit:      { label: 'Institute Visit',        icon: '🏫', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  training_session:     { label: 'Training Session',       icon: '📚', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  benchmark_audit:      { label: 'Benchmark Audit',        icon: '🔍', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  issue_identified:     { label: 'Issue Identified',       icon: '⚠️', color: 'bg-red-50 text-red-700 border-red-200' },
  requirement_captured: { label: 'Requirement Captured',   icon: '📋', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  pain_area_identified: { label: 'Pain Area Identified',   icon: '😟', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  leadership_meeting:   { label: 'Leadership Meeting',     icon: '👔', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  action_created:       { label: 'Action Created',         icon: '✅', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  implementation_update:{ label: 'Implementation Update',  icon: '🔧', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  follow_up:            { label: 'Follow-up',              icon: '🔄', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  support:              { label: 'Support',                icon: '🛠️', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  other:                { label: 'Other',                  icon: '📝', color: 'bg-gray-50 text-gray-700 border-gray-200' },
}

interface Activity {
  id: number
  date: string
  activity_type: string
  description: string
  people_met?: string
  findings?: string
  remarks?: string
  action_required?: string
  owner?: string
  due_date?: string
  status?: string
  related_type?: string
  related_id?: number
  institute_name?: string
  location_name?: string
  module_name?: string
  created_at?: string
  updated_at?: string
}

interface Props {
  activityId: number | null
  onClose: () => void
  onUpdated?: () => void
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'

export default function ActivityDetailDrawer({ activityId, onClose, onUpdated }: Props) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Activity>>({})

  useEffect(() => {
    if (activityId) { loadActivity(activityId) }
    else { setActivity(null); setEditing(false) }
  }, [activityId])

  async function loadActivity(id: number) {
    setLoading(true)
    const r = await window.api.activities.getById(id)
    if (r.success && r.data) {
      setActivity(r.data as Activity)
      setForm(r.data as Activity)
    }
    setLoading(false)
  }

  function startEdit() {
    setForm({ ...activity })
    setEditing(true)
  }

  function cancelEdit() {
    setForm({ ...activity })
    setEditing(false)
  }

  async function handleSave() {
    if (!activity) return
    setSaving(true)
    const r = await window.api.activities.update(activity.id, {
      description: form.description,
      findings: form.findings ?? null,
      remarks: form.remarks ?? null,
      actionRequired: form.action_required ?? null,
      owner: form.owner ?? null,
      dueDate: form.due_date ?? null,
      status: form.status ?? 'Logged',
    })
    if (r.success) {
      toast.success('Activity updated ✓')
      setEditing(false)
      loadActivity(activity.id)
      onUpdated?.()
    } else {
      toast.error(r.error ?? 'Failed to update')
    }
    setSaving(false)
  }

  const f = (key: keyof Activity, val: string) => setForm(p => ({ ...p, [key]: val }))

  const typeInfo = activity ? (ACTIVITY_LABELS[activity.activity_type] ?? ACTIVITY_LABELS.other) : null

  // Backdrop + drawer
  if (!activityId) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {typeInfo && (
              <span className="text-2xl">{typeInfo.icon}</span>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white truncate">
                {typeInfo?.label ?? 'Activity Detail'}
              </h2>
              {activity && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {activity.date} · ID #{activity.id}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!editing && activity && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
          )}

          {!loading && activity && (
            <>
              {/* Meta chips */}
              <div className="flex flex-wrap gap-2">
                {typeInfo && (
                  <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded border font-medium', typeInfo.color)}>
                    {typeInfo.icon} {typeInfo.label}
                  </span>
                )}
                {activity.status && (
                  <span className="text-xs px-2 py-1 rounded border bg-slate-50 text-slate-600 border-slate-200">
                    {activity.status}
                  </span>
                )}
                {activity.related_type && activity.related_id && (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded border bg-green-50 text-green-700 border-green-200">
                    <Link2 className="w-3 h-3" /> → {activity.related_type} #{activity.related_id}
                  </span>
                )}
              </div>

              {/* Info row */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {activity.institute_name && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{activity.institute_name}</span>
                  </div>
                )}
                {activity.location_name && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{activity.location_name}</span>
                  </div>
                )}
                {activity.module_name && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Package className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{activity.module_name}</span>
                  </div>
                )}
                {activity.people_met && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{activity.people_met}</span>
                  </div>
                )}
                {activity.date && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{activity.date}</span>
                  </div>
                )}
              </div>

              <hr className="border-slate-100 dark:border-slate-700" />

              {/* ─── EDITABLE FIELDS ─── */}
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Summary *</label>
                    <textarea
                      value={form.description ?? ''}
                      onChange={e => f('description', e.target.value)}
                      rows={3}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Findings / Notes</label>
                    <textarea
                      value={form.findings ?? ''}
                      onChange={e => f('findings', e.target.value)}
                      rows={2}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                    <textarea
                      value={form.remarks ?? ''}
                      onChange={e => f('remarks', e.target.value)}
                      rows={2}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Action Required</label>
                    <input
                      value={form.action_required ?? ''}
                      onChange={e => f('action_required', e.target.value)}
                      className={inputCls.replace('resize-none', '')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
                      <input
                        value={form.owner ?? ''}
                        onChange={e => f('owner', e.target.value)}
                        placeholder="Responsible person…"
                        className={inputCls.replace('resize-none', '')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={form.due_date ?? ''}
                        onChange={e => f('due_date', e.target.value)}
                        className={inputCls.replace('resize-none', '')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={form.status ?? 'Logged'}
                      onChange={e => f('status', e.target.value)}
                      className={inputCls.replace('resize-none', '')}
                    >
                      {['Logged', 'In Progress', 'Pending', 'Completed', 'Closed'].map(s => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ReadField label="Description" value={activity.description} multiline />
                  {activity.findings && <ReadField label="Findings / Notes" value={activity.findings} multiline />}
                  {activity.remarks && <ReadField label="Remarks" value={activity.remarks} multiline />}
                  {activity.action_required && (
                    <ReadField label="Action Required" value={activity.action_required} icon={<AlertCircle className="w-3.5 h-3.5 text-amber-500" />} />
                  )}
                  {(activity.owner || activity.due_date) && (
                    <div className="grid grid-cols-2 gap-3">
                      {activity.owner && <ReadField label="Owner" value={activity.owner} />}
                      {activity.due_date && <ReadField label="Due Date" value={activity.due_date} />}
                    </div>
                  )}
                  {activity.created_at && (
                    <p className="text-[11px] text-slate-400">
                      Logged: {formatDateTime(activity.created_at)}
                      {activity.updated_at && activity.updated_at !== activity.created_at && ` · Updated: ${formatDateTime(activity.updated_at)}`}
                    </p>
                  )}
                </div>
              )}

              <hr className="border-slate-100 dark:border-slate-700" />

              {/* ─── ATTACHMENTS ─── */}
              <AttachmentsPanel
                relatedType="daily_activity"
                relatedId={activity.id}
              />
            </>
          )}
        </div>

        {/* Footer (only when editing) */}
        {editing && (
          <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
            >
              <RotateCcw className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function ReadField({
  label,
  value,
  multiline = false,
  icon,
}: {
  label: string
  value: string
  multiline?: boolean
  icon?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-start gap-1.5">
        {icon}
        <p className={cn('text-sm text-slate-700 dark:text-slate-200', multiline ? 'whitespace-pre-wrap' : '')}>{value}</p>
      </div>
    </div>
  )
}
