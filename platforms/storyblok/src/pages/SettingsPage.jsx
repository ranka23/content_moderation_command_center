import React from 'react'
import { AiSettingsForm } from '@cmcc/ui'

export default function SettingsPage({ settings, updateSettings, addToast }) {
  const handleSave = (formData) => {
    updateSettings(formData)
    addToast('Settings saved')
  }

  const handleAiConfigChange = (config) => {
    updateSettings({ aiConfig: config })
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 600 }}>
        ⚙️ Settings
      </h2>

      <div
        style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 500 }}>
          API Configuration
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            API Endpoint URL
          </label>
          <input
            type="text"
            value={settings.apiEndpoint || ''}
            onChange={(e) => updateSettings({ apiEndpoint: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
            placeholder="http://localhost:3000"
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            API Key
          </label>
          <input
            type="password"
            value={settings.apiKey || ''}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
            placeholder="Optional API key"
          />
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '20px',
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

      <div
        style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 500 }}>
          Moderation Preferences
        </h3>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={settings.autoModerate || false}
            onChange={(e) => updateSettings({ autoModerate: e.target.checked })}
          />
          <span style={{ fontSize: '0.875rem' }}>Enable auto-moderation</span>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={settings.notifyOnFlag || false}
            onChange={(e) => updateSettings({ notifyOnFlag: e.target.checked })}
          />
          <span style={{ fontSize: '0.875rem' }}>Notify on flagged items</span>
        </label>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            Spam Threshold
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.spamThreshold ?? 0.7}
            onChange={(e) =>
              updateSettings({ spamThreshold: parseFloat(e.target.value) })
            }
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {(settings.spamThreshold ?? 0.7) * 100}%
          </span>
        </div>
      </div>

      <button
        onClick={() => handleSave(settings)}
        style={{
          padding: '10px 24px',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Save All Settings
      </button>
    </div>
  )
}
