import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Save } from 'lucide-react'
import { statusColor, cn } from '../../../lib/utils'

const BLANK = { name: '', code: '', category: 'Benchmark', description: '', status: 'Active' }
const CATEGORIES = ['Benchmark', 'Finance', 'HR', 'Operations', 'CRM', 'Payroll', 'Procurement', 'Analytics', 'Other']

export default function ModulesPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.modules.getAll()
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  function openCreate() { setEditingId(null); setForm(BLANK); setShowForm(true) }

  function openEdit(mod: Record<string, unknown>) {
    setEditingId(mod.id as number)
    setForm({
      name: (mod.name as string) ?? '', code: (mod.code as string) ?? '',
      category: (mod.category as string) ?? 'Benchmark',
      description: (mod.description as string) ?? '',
      status: (mod.status as string) ?? 'Active',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm(BLANK) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.code) { toast.error('Name and Code are required'); return }
    setSaving(true)
    if (editingId) {
      const r = await window.api.modules.update(editingId, form)
      if (r.success) { toast.success('Module updated ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to update')
    } else {
      const r = await window.api.modules.create(form)
      if (r.success) { toast.success('Module created ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to create')
    }
    setSaving(false)
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete module "${name}"? This may affect dropdown options.`)) return
    const r = await window.api.modules.delete(id)
    if (r.success) { toast.success('Deleted'); load() } else toast.error(r.error ?? 'Failed')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Modules / Products</h1>
          <p className="text-slate-500 text-sm mt-0.5">Benchmark products and software modules — used as dropdown options throughout the app</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Module
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-700 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {editingId ? '✏️ Edit Module' : '➕ New Module'}
            </h2>
            <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Module Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Code *</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['Active', 'Inactive'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end mt-1">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : editingId ? 'Update Module' : 'Create Module'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)
        ) : data.map(mod => (
          <div key={mod.id as number} className={cn('bg-white dark:bg-slate-800 rounded-xl border shadow-sm p-4 flex items-start justify-between', editingId === mod.id ? 'border-blue-400' : 'border-slate-200 dark:border-slate-700')}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">{mod.code as string}</span>
                <span className="text-xs text-slate-400">{mod.category as string}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(mod.status as string))}>{mod.status as string}</span>
              </div>
              <p className="font-medium text-slate-800 dark:text-white truncate">{mod.name as string}</p>
              {mod.description && <p className="text-xs text-slate-500 mt-1 truncate">{mod.description as string}</p>}
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              <button onClick={() => openEdit(mod)} title="Edit" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(mod.id as number, mod.name as string)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!loading && data.length === 0 && <div className="col-span-3 text-center py-20 text-slate-400 text-sm">No modules found. Click <strong>Add Module</strong> to get started.</div>}
      </div>
    </div>
  )
}
