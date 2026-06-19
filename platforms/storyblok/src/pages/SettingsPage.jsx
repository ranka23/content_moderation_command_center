import React, { useState, useRef, useCallback } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { SettingsForm, AiSettingsForm } from '@cmcc/ui'

const SETTINGS_SECTIONS = [
  {
    id: 'general',
    title: 'General',
    fields: [
      {
        name: 'apiEndpoint',
        label: 'API Endpoint URL',
        type: 'text',
        placeholder: 'http://localhost:3000',
      },
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Optional API key',
      },
    ],
  },
  {
    id: 'moderation',
    title: 'Moderation Preferences',
    fields: [
      {
        name: 'autoModerate',
        label: 'Enable auto-moderation',
        type: 'toggle',
      },
      {
        name: 'notifyOnFlag',
        label: 'Notify on flagged items',
        type: 'toggle',
      },
      {
        name: 'spamThreshold',
        label: 'Spam Threshold (0–1)',
        type: 'number',
        placeholder: '0.7',
        helpText: 'Threshold above which content is flagged as spam',
      },
    ],
  },
]

export default function SettingsPage({ settings, updateSettings, addToast }) {
  const [saving, setSaving] = useState(false)
  const [importExportMsg, setImportExportMsg] = useState(null)
  const fileInputRef = useRef(null)

  const handleSettingsSubmit = useCallback(
    (formData) => {
      setSaving(true)
      try {
        updateSettings(formData)
        addToast('Settings saved')
      } finally {
        setSaving(false)
      }
    },
    [updateSettings, addToast],
  )

  const handleAiConfigChange = useCallback(
    (config) => {
      updateSettings({ aiConfig: config })
    },
    [updateSettings],
  )

  const initialValues = {
    apiEndpoint: settings.apiEndpoint || '',
    apiKey: settings.apiKey || '',
    autoModerate: settings.autoModerate || false,
    notifyOnFlag: settings.notifyOnFlag || false,
    spamThreshold: settings.spamThreshold ?? 0.7,
  }

  const validators = {}

  // ── Export ──────────────────────────────────────────
  const handleExport = useCallback(async () => {
    try {
      const blob = new Blob([JSON.stringify(settings, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmcc-settings-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setImportExportMsg({ status: 'success', text: 'Settings exported' })
    } catch (err) {
      setImportExportMsg({ status: 'error', text: err.message })
    }
  }, [settings])

  // ── Import ──────────────────────────────────────────
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const importData = JSON.parse(text)
        updateSettings(importData)
        setImportExportMsg({
          status: 'success',
          text: 'Settings imported successfully',
        })
        addToast('Settings imported')
      } catch (err) {
        setImportExportMsg({
          status: 'error',
          text: `Import error: ${err.message}`,
        })
      }
      // Reset input so the same file can be re-imported
      e.target.value = ''
    },
    [updateSettings, addToast],
  )

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 600 }}>
        <SettingsIcon size={20} style={{ display: 'inline', marginRight: 8 }} />
        Settings
      </h2>

      {/* Import/Export Banner */}
      {importExportMsg && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            background:
              importExportMsg.status === 'success' ? '#ecfdf5' : '#fef2f2',
            color: importExportMsg.status === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${
              importExportMsg.status === 'success' ? '#a7f3d0' : '#fecaca'
            }`,
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{importExportMsg.text}</span>
          <button
            onClick={() => setImportExportMsg(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0 4px',
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Import/Export Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={handleExport}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Settings (JSON)
        </button>
        <button
          onClick={handleImportClick}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Settings (JSON)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Sections via SettingsForm */}
      <SettingsForm
        sections={SETTINGS_SECTIONS}
        initialValues={initialValues}
        onSubmit={handleSettingsSubmit}
        validators={validators}
        submitLabel="Save All Settings"
        isSubmitting={saving}
      />

      {/* AI Moderation */}
      <div
        style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginTop: '20px',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 500 }}>
          AI Moderation
        </h3>
        <AiSettingsForm
          config={settings.aiConfig || { engine: 'none' }}
          onChange={handleAiConfigChange}
        />
      </div>
    </div>
  )
}
