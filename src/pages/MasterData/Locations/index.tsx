import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Trash2, Edit, X, Save, MapPin } from 'lucide-react'
import { statusColor, cn } from '../../../lib/utils'

const BLANK = { name: '', city: '', emirate: '', address: '', contactPerson: '', contactNumber: '', email: '', status: 'Active', instituteId: '' }
const EMIRATES = ['Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah']

export default function LocationsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [institutes, setInstitutes] = useState<Record<string, unknown>[]>([])
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.api.institutes.getAll().then(r => { if (r.success) setInstitutes(r.data as Record<string, unknown>[]) })
    load()
  }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.locations.getAll({ search: filter })
    if (r.success) setData(r.data as Record<string, unknown>[])
    setLoading(false)
  }

  function openCreate() { setEditingId(null); setForm(BLANK); setShowForm(true) }

  function openEdit(row: Record<string, unknown>) {
    setEditingId(row.id as number)
    setForm({
      name: (row.name as string) ?? '', city: (row.city as string) ?? '',
      emirate: (row.emirate as string) ?? '', address: (row.address as string) ?? '',
      contactPerson: (row.contact_person as string) ?? '',
      contactNumber: (row.contact_number as string) ?? '',
      email: (row.email as string) ?? '', status: (row.status as string) ?? 'Active',
      instituteId: String(row.institute_id ?? ''),
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() { setShowForm(false); setEditingId(null); setForm(BLANK) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.instituteId) { toast.error('Name and Institute are required'); return }
    setSaving(true)
    if (editingId) {
      const r = await window.api.locations.update(editingId, form)
      if (r.success) { toast.success('Location updated ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to update')
    } else {
      const r = await window.api.locations.create(form)
      if (r.success) { toast.success('Location created ✓'); closeForm(); load() }
      else toast.error(r.error ?? 'Failed to create')
    }
    setSaving(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this location?')) return
    const r = await window.api.locations.delete(id)
    if (r.success) { toast.success('Deleted'); load() } else toast.error(r.error ?? 'Failed')
  }

  const f = (key: string) => (form as Record<string, string>)[key]
  const s = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Locations / Branches</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage institute locations and branches</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-700 p-5 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {editingId ? '✏️ Edit Location' : '➕ New Location'}
            </h2>
            <button onClick={closeForm} className="p-1 text-slate-400 hover:text-slate-600 rounded"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Institute *</label>
              <select value={form.instituteId} onChange={e => s('instituteId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select institute…</option>
                {institutes.map(i => <option key={i.id as number} value={i.id as number}>{i.name as string}</option>)}
              </select>
            </div>
            {[['name','Location / Branch Name *'],['city','City'],['address','Address'],['contactPerson','Contact Person'],['contactNumber','Contact Number'],['email','Email']].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                <input value={f(key)} onChange={e => s(key, e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Emirate</label>
              <select value={form.emirate} onChange={e => s('emirate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select…</option>
                {EMIRATES.map(em => <option key={em}>{em}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select value={form.status} onChange={e => s('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['Active','Inactive'].map(st => <option key={st}>{st}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end mt-1">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : editingId ? 'Update Location' : 'Create Location'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Search locations… (press Enter)"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Loading…</div>
        ) : (
          <table className="w-full">
            <thead><tr className="bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Name','Institute','City','Emirate','Contact','Status','Actions'].map(h => <th key={h} className="text-left px-4 py-3">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {data.map(row => (
                <tr key={row.id as number} className={cn('hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors', editingId === row.id ? 'bg-blue-50 dark:bg-blue-950/20' : '')}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-white">
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{row.name as string}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{row.institute_name as string}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{(row.city as string) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{(row.emirate as string) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{(row.contact_person as string) || '—'}</td>
                  <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded', statusColor(row.status as string))}>{row.status as string}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(row)} title="Edit" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(row.id as number)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No locations found. Click <strong>Add Location</strong> to get started.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
