import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Save, KeyRound, Shield } from 'lucide-react'
import { statusColor, cn } from '../../../lib/utils'

const BLANK = { username: '', fullName: '', email: '', role: 'user', password: '', status: 'active' }
const ROLES = ['admin', 'portfolio_manager', 'management', 'user'] as const
const roleBadge: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  portfolio_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  management: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  user: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}
const roleLabel: Record<string, string> = {
  admin: 'Admin', portfolio_manager: 'Portfolio Manager', management: 'Management', user: 'User',
}

export default function UsersPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [resetId, setResetId] = useState<number | null>(null)
  const [newPwd, setNewPwd] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.users.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  function openCreate() { setEditingId(null); setForm(BLANK); setShowForm(true) }

  function openEdit(row: Record<string, unknown>) {
    setEditingId(row.id as number)
    setForm({
      username: (row.username as string) ?? '',
      fullName: (row.full_name as string) ?? '',
      email: (row.email as string) ?? '',
      role: (row.role as string) ?? 'user',
      status: (row.status as string) ?? 'active',
      password: '', // password not shown on edit
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm(BLANK) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.username || !form.fullName) { toast.error('Username and Full Name are required'); return }
    if (!editingId && !form.password) { toast.error('Password is required for new users'); return }
    setSaving(true)
    if (editingId) {
      const r = await window.api.users.update(editingId, { fullName: form.fullName, email: form.email, role: form.role, status: form.status })
      if (r.success) { toast.success('User updated ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to update')
    } else {
      const r = await window.api.users.create(form)
      if (r.success) { toast.success('User created ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to create')
    }
    setSaving(false)
  }

  async function handleResetPassword(id: number) {
    if (!newPwd || newPwd.length < 4) { toast.error('Password must be at least 4 characters'); return }
    const r = await window.api.users.resetPassword(id, newPwd)
    if (r.success) { toast.success('Password reset ✓'); setResetId(null); setNewPwd('') }
    else toast.error(r.error ?? 'Failed')
  }

  async function handleDeactivate(id: number, username: string) {
    if (!confirm(`Deactivate user "${username}"?`)) return
    const r = await window.api.users.delete(id)
    if (r.success) { toast.success('User deactivated'); load() } else toast.error(r.error ?? 'Failed')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Users & Roles</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage user accounts and access roles</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-700 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {editingId ? '✏️ Edit User' : '➕ New User'}
            </h2>
            <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Username *</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                disabled={!!editingId} readOnly={!!editingId}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
              <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ROLES.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['active','inactive'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {!editingId && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end mt-1">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : editingId ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div> : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['User','Username','Role','Status','Last Login','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <>
                  <tr key={row.id as number} className={cn('hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors', editingId === row.id ? 'bg-blue-50 dark:bg-blue-950/20' : '')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(row.full_name as string)?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{row.full_name as string}</p>
                          <p className="text-xs text-slate-400">{(row.email as string) || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 font-mono">{row.username as string}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 w-fit', roleBadge[row.role as string] ?? 'bg-slate-100 text-slate-600')}>
                        <Shield className="w-3 h-3" />{roleLabel[row.role as string] ?? row.role as string}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.last_login ? new Date(row.last_login as string).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(row)} title="Edit user" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => { setResetId(resetId === (row.id as number) ? null : row.id as number); setNewPwd('') }} title="Reset password" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded transition"><KeyRound className="w-4 h-4" /></button>
                        <button onClick={() => handleDeactivate(row.id as number, row.username as string)} title="Deactivate" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                  {resetId === (row.id as number) && (
                    <tr key={`reset-${row.id}`} className="bg-amber-50 dark:bg-amber-950/20">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Reset password for <strong>{row.username as string}</strong>:</span>
                          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="New password…"
                            className="border border-amber-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 w-48" />
                          <button onClick={() => handleResetPassword(row.id as number)} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700">Reset</button>
                          <button onClick={() => { setResetId(null); setNewPwd('') }} className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {data.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No users found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
