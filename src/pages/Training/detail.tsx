import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, statusColor, cn } from '../../lib/utils'

export default function TrainingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [newParticipant, setNewParticipant] = useState({ participantName: '', department: '', role: '' })
  const [addingP, setAddingP] = useState(false)

  useEffect(() => { if (id) load() }, [id])

  async function load() {
    setLoading(true)
    const r = await window.api.training.getSessionById(Number(id))
    if (r.success) setData(r.data as Record<string, unknown>)
    setLoading(false)
  }

  async function addParticipant(e: React.FormEvent) {
    e.preventDefault()
    if (!newParticipant.participantName) { toast.error('Name required'); return }
    setAddingP(true)
    const r = await window.api.training.addParticipants({ sessionId: Number(id), participants: [{ ...newParticipant, attended: true }] })
    if (r.success) { toast.success('Participant added'); setNewParticipant({ participantName: '', department: '', role: '' }); load() }
    else toast.error(r.error ?? 'Failed')
    setAddingP(false)
  }

  async function toggleAttendance(participantId: number, attended: boolean) {
    await window.api.training.updateParticipant({ id: participantId, data: { attended: !attended } })
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading…</div>
  if (!data) return <div className="text-center py-20 text-slate-400"><p>Session not found</p></div>

  const participants = (data.participants ?? []) as Record<string, unknown>[]

  return (
    <div>
      <button onClick={() => navigate('/training')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"><ArrowLeft className="w-4 h-4" /> Back</button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{data.topic as string}</h1>
        <p className="text-slate-500 text-sm">{data.institute_name as string} · {formatDate(data.training_date as string)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[['Type', (data.training_type as string)?.replace(/_/g,' ')], ['Module', data.module_name ?? '—'], ['Trainer', data.trainer ?? '—'], ['Duration', `${data.duration_hours ?? '—'} hrs`], ['Expected', data.participant_count ?? '—'], ['Attended', data.actual_attendance ?? '—'], ['Status', data.status]].map(([k, v]) => (
          <div key={k as string} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-xs text-slate-400 mb-1">{k as string}</p>
            <p className="text-sm font-medium text-slate-800 dark:text-white">{v as string ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Participants */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Participants ({participants.length})</h3>
        </div>
        <div className="p-4">
          <form onSubmit={addParticipant} className="flex gap-3 mb-4 flex-wrap">
            <input value={newParticipant.participantName} onChange={e => setNewParticipant(p => ({...p, participantName: e.target.value}))} placeholder="Name *" className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={newParticipant.department} onChange={e => setNewParticipant(p => ({...p, department: e.target.value}))} placeholder="Department" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={newParticipant.role} onChange={e => setNewParticipant(p => ({...p, role: e.target.value}))} placeholder="Role" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={addingP} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 disabled:opacity-60"><Plus className="w-3.5 h-3.5" /> Add</button>
          </form>
          <table className="w-full">
            <thead><tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
              {['Name','Department','Role','Attended'].map(h => <th key={h} className="text-left px-2 py-2">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {participants.map(p => (
                <tr key={p.id as number}>
                  <td className="px-2 py-2 text-sm text-slate-800 dark:text-white">{p.participant_name as string}</td>
                  <td className="px-2 py-2 text-sm text-slate-500">{p.department as string ?? '—'}</td>
                  <td className="px-2 py-2 text-sm text-slate-500">{p.role as string ?? '—'}</td>
                  <td className="px-2 py-2">
                    <button onClick={() => toggleAttendance(p.id as number, p.attended as boolean)}
                      className={cn('w-7 h-7 rounded-full flex items-center justify-center transition', p.attended ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200')}>
                      {p.attended ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              {participants.length === 0 && <tr><td colSpan={4} className="px-2 py-8 text-center text-slate-400 text-sm">No participants added</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedback */}
      {data.feedback && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mt-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Feedback</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{data.feedback as string}</p>
        </div>
      )}
    </div>
  )
}
