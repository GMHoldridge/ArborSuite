import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { toast, errorMessage } from '../../stores/toast'
import type { Settings } from '../../types/index'

const FIELDS: { key: keyof Settings; label: string; placeholder: string; type?: string }[] = [
  { key: 'business_name', label: 'Business name', placeholder: 'Kustom Tree Care Inc.' },
  { key: 'owner_name', label: 'Owner name', placeholder: 'Max Yantachka' },
  { key: 'email', label: 'Email (estimates send from here)', placeholder: 'you@yahoo.com', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '(585) 991-9289', type: 'tel' },
  { key: 'address', label: 'Address', placeholder: '6291 Buffalo Rd, Churchville, NY 14428' },
  { key: 'license_number', label: 'License / cert # (optional)', placeholder: 'ISA / state license' },
  { key: 'logo_url', label: 'Logo image URL (optional)', placeholder: 'https://…/logo.png' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<Settings>('/settings')
      .then(setSettings)
      .catch((e) => toast.error(errorMessage(e, 'Failed to load settings')))
      .finally(() => setLoading(false))
  }, [])

  function update(key: keyof Settings, value: string) {
    setSettings((s) => (s ? { ...s, [key]: value } : s))
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const saved = await api.put<Settings>('/settings', settings)
      setSettings(saved)
      toast.success('Saved — this appears on every estimate')
    } catch (e: unknown) {
      toast.error(errorMessage(e, 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-[#228B22] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Business Profile</h1>
      <p className="text-sm text-gray-500 mb-4">Shown on the estimates your clients receive.</p>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-sm font-medium text-gray-700">{f.label}</span>
            <input
              type={f.type || 'text'}
              value={(settings[f.key] as string) || ''}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#228B22]"
            />
          </label>
        ))}

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Brand color</span>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={settings.accent_color || '#228B22'}
              onChange={(e) => update('accent_color', e.target.value)}
              className="w-12 h-10 rounded border border-gray-300"
            />
            <span className="text-sm text-gray-500">{settings.accent_color || '#228B22'}</span>
          </div>
        </label>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 w-full py-3.5 rounded-xl bg-[#228B22] text-white font-semibold text-base disabled:opacity-50 active:bg-[#1a6b1a] transition-colors min-h-[48px]"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
