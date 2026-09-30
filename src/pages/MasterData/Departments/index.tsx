import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Save, Users } from 'lucide-react'
import { statusColor, cn } from '../../../lib/utils'

const BLANK = { name: '', code: '', status: 'Active', description: '' }

export default function DepartmentsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.departments.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  function openCreate() { setEditingId(null); setForm(BLANK); setShowForm(true) }

  function openEdit(row: Record<string, unknown>) {
    setEditingId(row.id as number)
    setForm({
      name: (row.name as string) ?? '',
      code: (row.code as string) ?? '',
      status: (row.status as string) ?? 'Active',
      description: (row.description as string) ?? '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm(BLANK) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Department name is required'); return }
    setSaving(true)
    if (editingId) {
      const r = await window.api.departments.update(editingId, form)
      if (r.success) { toast.success('Department updated ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to update')
    } else {
      const r = await window.api.departments.create(form)
      if (r.success) { toast.success('Department created ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to create')
    }
    setSaving(false)
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete department "${name}"?`)) return
    const r = await window.api.departments.delete(id)
    if (r.success) { toast.success('Deleted'); load() } else toast.error(r.error ?? 'Failed')
  }

  const filtered = data.filter(d =>
    !search ||
    (d.name as string)?.toLowerCase().includes(search.toLowerCase()) ||
    (d.code as string)?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Departments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Common department list — shared across <strong>all institutes</strong>
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-5 flex items-start gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 text-xs text-blue-700 dark:text-blue-300">
        <Users className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Departments you add here are available as dropdown options across <strong>all institutes</strong> — no need to add them separately per institute.</span>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-700 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {editingId ? '✏️ Edit Department' : '➕ New Department'}
            </h2>
            <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Department Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Finance, HR, Operations, IT…"
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Short Code</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="e.g. FIN, HR, OPS…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-4">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description <span className="text-slate-400">(optional)</span></label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this department's role…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 md:col-span-4 flex gap-2 justify-end mt-1">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : editingId ? 'Update Department' : 'Add Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search + Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search departments…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400 shrink-0">{filtered.length} department{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Department Name</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(row => (
                <tr
                  key={row.id as number}
                  className={cn(
                    'hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors',
                    editingId === row.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  )}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-white">{row.name as string}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-500">{(row.code as string) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{(row.description as string) || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(row)}
                        title="Edit"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id as number, row.name as string)}
                        title="Delete"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 text-sm">No departments yet.</p>
                    <p className="text-slate-400 text-xs mt-1">Click <strong>Add Department</strong> to create your first one.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
