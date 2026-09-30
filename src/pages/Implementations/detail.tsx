import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, statusColor, cn } from '../../lib/utils'

export default function ImplementationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ taskName: '', assignee: '', startDate: '', targetDate: '', status: 'not_started', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    const r = await window.api.implementations.getById(Number(id))
    if (r.success) setData(r.data as Record<string, unknown>)
    setLoading(false)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskForm.taskName) { toast.error('Task name required'); return }
    setSaving(true)
    const r = await window.api.implementations.upsertTask({ ...taskForm, implementationId: Number(id) })
    if (r.success) { toast.success('Task added'); setTaskForm({ taskName: '', assignee: '', startDate: '', targetDate: '', status: 'not_started', notes: '' }); setShowTaskForm(false); load() }
    else toast.error(r.error ?? 'Failed')
    setSaving(false)
  }

  async function toggleTask(taskId: number, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'in_progress' : 'completed'
    await window.api.implementations.upsertTask({ id: taskId, status: newStatus, implementationId: Number(id) })
    load()
  }

  async function deleteTask(taskId: number) {
    await window.api.implementations.deleteTask(taskId)
    toast.success('Task removed'); load()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
  if (!data) return <div className="text-center py-20 text-slate-400">Implementation not found</div>

  const tasks = (data.tasks ?? []) as Record<string, unknown>[]
  const completed = tasks.filter(t => t.status === 'completed').length

  return (
    <div>
      <button onClick={() => navigate('/implementations')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"><ArrowLeft className="w-4 h-4" /> Back</button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono font-bold text-blue-600">{data.impl_ref as string}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(data.status as string))}>{(data.status as string)?.replace(/_/g,' ')}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{data.project_name as string}</h1>
          <p className="text-slate-500 text-sm">{data.institute_name as string}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-blue-600">{data.progress_pct as number ?? 0}%</p>
          <p className="text-xs text-slate-400 mt-0.5">{completed}/{tasks.length} tasks done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all" style={{ width: `${data.progress_pct as number ?? 0}%` }} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[['Type', (data.impl_type as string)?.replace(/_/g,' ')], ['Module', data.module_name ?? '—'], ['Owner', data.owner ?? '—'], ['Start Date', formatDate(data.start_date as string)], ['Target Date', formatDate(data.target_date as string)], ['Actual Completion', formatDate(data.actual_completion as string)], ['Status', (data.status as string)?.replace(/_/g,' ')]].map(([k, v]) => (
          <div key={k as string} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">{k as string}</p>
            <p className="text-sm font-medium text-slate-800 dark:text-white">{v as string ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Tasks */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tasks ({tasks.length})</h3>
          <button onClick={() => setShowTaskForm(!showTaskForm)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"><Plus className="w-3.5 h-3.5" /> Add Task</button>
        </div>

        {showTaskForm && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
            <form onSubmit={addTask} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Task Name *</label><input value={taskForm.taskName} onChange={e => setTaskForm(f => ({...f, taskName: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Assignee</label><input value={taskForm.assignee} onChange={e => setTaskForm(f => ({...f, assignee: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Target Date</label><input type="date" value={taskForm.targetDate} onChange={e => setTaskForm(f => ({...f, targetDate: e.target.value}))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="col-span-2 md:col-span-4 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowTaskForm(false)} className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">{saving ? 'Adding…' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {tasks.map(task => (
            <div key={task.id as number} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
              <button onClick={() => toggleTask(task.id as number, task.status as string)}
                className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition',
                  task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400')}>
                {task.status === 'completed' && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium text-slate-800 dark:text-white', task.status === 'completed' && 'line-through text-slate-400')}>{task.task_name as string}</p>
                {task.assignee && <p className="text-xs text-slate-400">{task.assignee as string}</p>}
              </div>
              <div className="flex items-center gap-3">
                {task.target_date && <p className="text-xs text-slate-400">{formatDate(task.target_date as string)}</p>}
                <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(task.status as string))}>{(task.status as string)?.replace(/_/g,' ')}</span>
                <button onClick={() => deleteTask(task.id as number)} className="text-slate-300 hover:text-red-500 transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-sm">No tasks added yet. Add tasks to track progress.</div>}
        </div>
      </div>
    </div>
  )
}
