import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Settings, Save } from 'lucide-react'

const SETTING_GROUPS = [
  {
    label: 'App Settings',
    settings: [
      { key: 'app_name', label: 'Application Name', type: 'text', default: 'CEIM Portal' },
      { key: 'portfolio_manager_name', label: 'Portfolio Manager Name', type: 'text', default: '' },
      { key: 'region', label: 'Region / Country', type: 'text', default: 'UAE' },
    ]
  },
  {
    label: 'Notifications',
    settings: [
      { key: 'notify_overdue_actions', label: 'Notify on Overdue Actions', type: 'checkbox', default: 'true' },
      { key: 'notify_pending_approvals', label: 'Notify on Pending Approvals', type: 'checkbox', default: 'true' },
      { key: 'notification_check_interval', label: 'Check Interval (minutes)', type: 'number', default: '5' },
    ]
  },
  {
    label: 'Report Settings',
    settings: [
      { key: 'company_name', label: 'Company Name', type: 'text', default: 'Educational Software Co.' },
      { key: 'report_output_dir', label: 'Report Output Directory', type: 'text', default: '' },
      { key: 'include_logo_in_reports', label: 'Include Logo in Reports', type: 'checkbox', default: 'false' },
    ]
  },
  {
    label: 'Theme',
    settings: [
      { key: 'default_theme', label: 'Default Theme', type: 'select', options: ['light','dark','system'], default: 'light' },
      { key: 'date_format', label: 'Date Format', type: 'select', options: ['YYYY-MM-DD','DD/MM/YYYY','MM/DD/YYYY'], default: 'YYYY-MM-DD' },
    ]
  },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await window.api.settings.getAll()
    if (r.success) {
      const s: Record<string, string> = {}
      for (const row of (r.data as Record<string, unknown>[]) ?? []) s[row.key as string] = row.value as string
      setSettings(s)
    }
    setLoading(false)
  }

  function get(key: string, def: string) { return settings[key] ?? def }
  function set(key: string, val: string) { setSettings(p => ({...p, [key]: val})) }

  async function save() {
    setSaving(true)
    const pairs = Object.entries(settings).map(([key, value]) => ({ key, value }))
    const r = await window.api.settings.setMany(pairs)
    if (r.success) { toast.success('Settings saved') } else { toast.error('Failed to save') }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading settings…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure application preferences</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-6">
        {SETTING_GROUPS.map(group => (
          <div key={group.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.label}</h3>
            </div>
            <div className="p-5 space-y-4">
              {group.settings.map(s => (
                <div key={s.key} className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.label}</label>
                  </div>
                  <div className="w-64">
                    {s.type === 'checkbox' ? (
                      <input type="checkbox"
                        checked={get(s.key, s.default) === 'true'}
                        onChange={e => set(s.key, String(e.target.checked))}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    ) : s.type === 'select' ? (
                      <select value={get(s.key, s.default)} onChange={e => set(s.key, e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {s.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={s.type} value={get(s.key, s.default)} onChange={e => set(s.key, e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
