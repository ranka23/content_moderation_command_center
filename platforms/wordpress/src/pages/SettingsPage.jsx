import React, {
  useEffect,
  startTransition,
  useState,
  useCallback,
  useRef,
} from 'react'
import { Button, SettingsForm, AiSettingsForm } from '@cmcc/ui'
import { Cpu, Download, Upload } from 'lucide-react'
import { apiFetch } from '../lib/api'

/**
 * Settings tab page.
 * Renders the SettingsForm with all tabbed sections and Export/Import
 * backup actions below the form.
 */
export default function SettingsPage({ settings, addToast }) {
  const {
    settingsSections,
    settingsInitialValues,
    settingsValidators,
    fetchSettings,
    handleSettingsSave,
  } = settings

  // ── AI Moderation config state (derived from server settings) ───────
  const [aiConfig, setAiConfig] = useState(() => {
    if (settingsInitialValues?.engine !== undefined) {
      return {
        engine: settingsInitialValues.engine || 'none',
        apiKey: settingsInitialValues.apiKey || '',
        model: settingsInitialValues.model || '',
        autoModerate: settingsInitialValues.autoModerate ?? false,
        spamThreshold: settingsInitialValues.spamThreshold ?? 70,
        enableLanguageDetection:
          settingsInitialValues.enableLanguageDetection ?? true,
        enableSentimentAnalysis:
          settingsInitialValues.enableSentimentAnalysis ?? false,
      }
    }
    return {
      engine: 'none',
      apiKey: '',
      model: '',
      autoModerate: false,
      spamThreshold: 70,
      enableLanguageDetection: true,
      enableSentimentAnalysis: false,
    }
  })

  // Sync aiConfig when server settings finish loading
  const prevInitialValuesRef = useRef({})
  useEffect(() => {
    // Only sync when settings have loaded with real data (engine from server)
    if (
      settingsInitialValues?.engine !== undefined &&
      // Avoid re-syncing after user edits by checking if initial sync happened
      prevInitialValuesRef.current !== settingsInitialValues
    ) {
      prevInitialValuesRef.current = settingsInitialValues
      setAiConfig({
        engine: settingsInitialValues.engine || 'none',
        apiKey: settingsInitialValues.apiKey || '',
        model: settingsInitialValues.model || '',
        autoModerate: settingsInitialValues.autoModerate ?? false,
        spamThreshold: settingsInitialValues.spamThreshold ?? 70,
        enableLanguageDetection:
          settingsInitialValues.enableLanguageDetection ?? true,
        enableSentimentAnalysis:
          settingsInitialValues.enableSentimentAnalysis ?? false,
      })
    }
  }, [settingsInitialValues])

  // Update the default model when engine changes
  const handleAiConfigChange = useCallback((newConfig) => {
    setAiConfig(newConfig)
  }, [])

  // Load settings on mount
  useEffect(() => {
    startTransition(() => {
      fetchSettings()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Export handler ─────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const data = await apiFetch('settings/export', { method: 'POST' })
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmcc-settings-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast('Settings exported successfully', 'success')
    } catch {
      addToast('Failed to export settings', 'error')
    }
  }

  // ── Import handler ─────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      await apiFetch('settings/import', {
        method: 'POST',
        body: JSON.stringify({ settings: parsed.data || parsed }),
      })
      addToast('Settings imported. Reloading...', 'success')
      setTimeout(() => fetchSettings(), 1000)
    } catch {
      addToast('Failed to import settings: invalid file', 'error')
    }
    e.target.value = ''
  }

  // ── Loading state ──────────────────────────────────────────────────
  if (settingsSections.length === 0) {
    return (
      <div className="cmcc-tab-panel" role="tabpanel">
        <div className="cmcc-loading">
          <div className="cmcc-spinner" />
          <span>Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="cmcc-tab-panel" role="tabpanel">
      <SettingsForm
        sections={settingsSections.filter((s) => s.id !== 'ai_moderation')}
        onSubmit={(formData) => {
          handleSettingsSave({ ...formData, ...aiConfig })
        }}
        initialValues={settingsInitialValues}
        validators={settingsValidators}
        submitLabel="Save Settings"
      />

      {/* AI Moderation Section - uses the dedicated AiSettingsForm component */}
      {settingsSections.some((s) => s.id === 'ai_moderation') && (
        <div className="tw-mt-8">
          <h3 className="tw-text-lg tw-font-semibold tw-mb-4">
            <Cpu size={20} className="tw-inline tw-mr-2" /> AI Moderation
          </h3>
          <div className="tw-rounded-lg tw-border tw-border-gray-200 tw-bg-white tw-p-6">
            <AiSettingsForm config={aiConfig} onChange={handleAiConfigChange} />
          </div>
        </div>
      )}

      {/* Export / Import actions */}
      {settingsSections.some((s) => s.id === 'backup_restore') && (
        <div className="tw-mt-6 tw-flex tw-gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} className="tw-inline tw-mr-1" /> Export Settings
          </Button>
          <label className="tw-cursor-pointer tw-inline-flex tw-items-center tw-justify-center tw-rounded-md tw-text-xs tw-font-medium tw-transition-colors tw-h-9 tw-px-3 tw-bg-white tw-text-gray-900 hover:tw-bg-gray-100 tw-border tw-border-gray-300">
            <Upload size={14} className="tw-inline tw-mr-1" /> Import Settings
            <input
              type="file"
              id="cmcc-import-settings"
              name="cmcc-import-settings"
              accept=".json"
              className="tw-hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      )}
    </div>
  )
}
