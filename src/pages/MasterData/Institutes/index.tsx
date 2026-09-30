import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, Building2, Mail, Phone, Trash2, Edit, ChevronRight, X, Save } from 'lucide-react'
import { cn, statusColor } from '../../../lib/utils'

interface Institute {
  id: number; code: string; name: string; type: string; org: string | null; status: string
  primary_contact: string | null; email: string | null; phone: string | null; notes: string | null
  location_count: number; visit_count: number; req_count: number; issue_count: number
}

const BLANK = { code: '', name: '', type: 'School', org: '', status: 'Active', primaryContact: '', email: '', phone: '', notes: '' }
const TYPES = ['School', 'University', 'College', 'Education Group', 'Training Center', 'Other']
const ORG_GROUPS = ['', 'Government', 'Private Group', 'Corporate', 'NGO / Non-Profit', 'International Chain', 'Other']

export default function Institutes() {
  const navigate = useNavigate()
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.institutes.getAll({ search })
    if (r.success) setInstitutes(r.data as Institute[])
    setLoading(false)
  }

  function openCreate() {
    setEditingId(null)
    setForm(BLANK)
    setShowForm(true)
  }

  function openEdit(inst: Institute) {
    setEditingId(inst.id)
    setForm({
      code: inst.code, name: inst.name, type: inst.type, org: inst.org ?? '',
      status: inst.status, primaryContact: inst.primary_contact ?? '',
      email: inst.email ?? '', phone: inst.phone ?? '', notes: inst.notes ?? ''
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm(BLANK) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.name) { toast.error('Code and Name are required'); return }
    setSaving(true)
    if (editingId) {
      const r = await window.api.institutes.update(editingId, form)
      if (r.success) { toast.success('Institute updated ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to update')
    } else {
      const r = await window.api.institutes.create(form)
      if (r.success) { toast.success('Institute created ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to create')
    }
    setSaving(false)
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Archive "${name}"? It will be hidden but data is preserved.`)) return
    const r = await window.api.institutes.delete(id)
    if (r.success) { toast.success('Institute archived'); load() }
    else toast.error(r.error ?? 'Failed to archive')
  }

  const filtered = institutes.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())
  )

  const field = (key: string) => (form as Record<string, string>)[key]
  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Institutes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage client institutes and schools</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Institute
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-700 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {editingId ? '✏️ Edit Institute' : '➕ New Institute'}
            </h2>
            <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'code', label: 'Code *' },
              { key: 'name', label: 'Name *' },
              { key: 'primaryContact', label: 'Primary Contact' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                <input value={field(key)} onChange={e => set(key, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Organisation / Group</label>
              <select value={form.org} onChange={e => set('org', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Select —</option>
                {ORG_GROUPS.filter(Boolean).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['Active', 'Inactive'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end mt-1">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : editingId ? 'Update Institute' : 'Create Institute'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); load() }} placeholder="Search institutes…"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-44 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center py-20 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No institutes found. Click <strong>Add Institute</strong> to get started.</p>
          </div>
        ) : filtered.map(inst => (
          <div key={inst.id} className={cn('bg-white dark:bg-slate-800 rounded-xl border shadow-sm hover:shadow-md transition-shadow', editingId === inst.id ? 'border-blue-400' : 'border-slate-200 dark:border-slate-700')}>
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">{inst.code}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded', statusColor(inst.status))}>{inst.status}</span>
                    <span className="text-xs text-slate-400">{inst.type}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-white mt-1 truncate">{inst.name}</h3>
                  {inst.org && <p className="text-xs text-slate-400 truncate">{inst.org}</p>}
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <button onClick={() => openEdit(inst)} title="Edit" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => navigate(`/master/institutes/${inst.id}`)} title="View details" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(inst.id, inst.name)} title="Archive" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {inst.primary_contact && <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" />{inst.primary_contact}</p>}
              {inst.email && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{inst.email}</p>}
              {inst.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{inst.phone}</p>}
              <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                {[['Locations', inst.location_count], ['Visits', inst.visit_count], ['Reqs', inst.req_count], ['Issues', inst.issue_count]].map(([label, val]) => (
                  <div key={label as string} className="text-center">
                    <p className="text-base font-bold text-slate-800 dark:text-white">{val as number}</p>
                    <p className="text-[10px] text-slate-400">{label as string}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
