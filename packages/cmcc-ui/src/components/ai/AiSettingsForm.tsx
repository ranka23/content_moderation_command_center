import React, { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import {
  fetchAvailableModels,
  getDefaultModelId,
  isModelCompatible,
} from '@cmcc/core'
import type { AiModelInfo } from '@cmcc/core'

export type AiEngineType =
  | 'none'
  | 'local'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'custom'

export interface AiSettingsConfig {
  engine: AiEngineType
  apiKey: string
  model: string
  autoModerate: boolean
  spamThreshold: number
  enableLanguageDetection: boolean
  enableSentimentAnalysis: boolean
}

export interface AiSettingsFormProps {
  config: AiSettingsConfig
  onChange: (config: AiSettingsConfig) => void
  className?: string
}

const ENGINE_LABELS: Record<AiEngineType, string> = {
  none: 'Disabled',
  local: 'Local (Built-in)',
  openai: 'OpenAI',
  claude: 'Claude (Anthropic)',
  gemini: 'Google Gemini',
  custom: 'Custom API (coming soon)',
}

const ENGINE_DESCRIPTIONS: Record<AiEngineType, string> = {
  none: 'AI moderation is disabled. Content will be moderated using firewall rules only.',
  local:
    'Built-in keyword and pattern-based detection. No API key required. Works offline.',
  openai:
    'Uses OpenAI GPT models for spam detection, sentiment analysis, and language detection.',
  claude:
    'Uses Anthropic Claude models for spam detection, sentiment analysis, and language detection.',
  gemini:
    'Uses Google Gemini models for spam detection, sentiment analysis, and language detection.',
  custom: 'Custom AI API endpoint (coming in a future release).',
}

export function AiSettingsForm({
  config,
  onChange,
  className,
}: AiSettingsFormProps): React.ReactElement {
  const [showApiKey, setShowApiKey] = useState(false)

  // ── Dynamic model list state ────────────────────────────────────────
  const [availableModels, setAvailableModels] = useState<AiModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const prevEngineRef = useRef(config.engine)
  // Track whether we have an initial default for the current engine
  const initialDefaultSet = useRef(false)

  // ── Fetch models when engine changes ────────────────────────────────
  useEffect(() => {
    if (
      config.engine !== 'openai' &&
      config.engine !== 'claude' &&
      config.engine !== 'gemini'
    ) {
      // Non-cloud engines don't need model fetching
      const nonCloudId = setTimeout(() => setAvailableModels([]), 0)
      return (): void => {
        clearTimeout(nonCloudId)
      }
    }

    const engine: 'openai' | 'claude' | 'gemini' = config.engine
    let cancelled = false

    // Defer error state clear to avoid cascading renders per react-hooks/set-state-in-effect
    const clearErrorId = setTimeout(() => {
      if (!cancelled) setModelsError(null)
    }, 0)

    // Defer loading state to avoid cascading renders per react-hooks/set-state-in-effect
    const loadingId = setTimeout(() => {
      if (!cancelled) setModelsLoading(true)
    }, 0)

    ;(async (): Promise<void> => {
      try {
        const models = await fetchAvailableModels(
          engine,
          config.apiKey || undefined,
          undefined,
        )
        if (cancelled) return
        if (models.length > 0) {
          setAvailableModels(models)
        }

        // If we just switched to this engine and the current model is
        // incompatible, auto-select the default for this provider.
        if (prevEngineRef.current !== engine && !initialDefaultSet.current) {
          initialDefaultSet.current = true
          const isCompat = isModelCompatible(config.model, engine)
          if (!isCompat) {
            const defaultId = await getDefaultModelId(
              engine,
              config.apiKey || undefined,
            )
            if (!cancelled && defaultId !== config.model) {
              onChange({ ...config, model: defaultId })
            }
          }
        }
      } catch {
        if (!cancelled) {
          setModelsError('Failed to load model list. Using fallback.')
        }
      } finally {
        if (!cancelled) {
          clearTimeout(loadingId)
          setModelsLoading(false)
        }
      }
    })()

    return (): void => {
      cancelled = true
      clearTimeout(loadingId)
      clearTimeout(clearErrorId)
    }
  }, [config.engine, config.apiKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Track engine changes for auto-selection logic
  useEffect((): (() => void) | void => {
    if (prevEngineRef.current !== config.engine) {
      initialDefaultSet.current = false
      // Clear models when switching away from cloud engines
      if (
        config.engine !== 'openai' &&
        config.engine !== 'claude' &&
        config.engine !== 'gemini'
      ) {
        // Clearing models is deferred to avoid cascading renders
        const clearId = setTimeout(() => setAvailableModels([]), 0)
        prevEngineRef.current = config.engine
        return (): void => {
          clearTimeout(clearId)
        }
      }
    }
    prevEngineRef.current = config.engine
    return undefined
  }, [config.engine])

  const updateField = <K extends keyof AiSettingsConfig>(
    field: K,
    value: AiSettingsConfig[K],
  ): void => {
    onChange({ ...config, [field]: value })
  }

  /**
   * Determine whether the current engine is API-based and should show
   * the API key + model selector.
   */
  const isCloudEngine =
    config.engine === 'openai' ||
    config.engine === 'claude' ||
    config.engine === 'gemini'
  const apiKeyPlaceholder =
    config.engine === 'claude'
      ? 'sk-ant-...'
      : config.engine === 'gemini'
        ? 'AIza...'
        : 'sk-...'

  return (
    <div className={cn('tw-space-y-5', className)}>
      {/* AI Engine Selection */}
      <div>
        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1.5">
          AI Moderation Engine
        </label>
        <select
          value={config.engine}
          onChange={(e) =>
            updateField('engine', e.target.value as AiEngineType)
          }
          className="tw-w-full tw-rounded-md tw-border tw-border-gray-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500"
        >
          {(Object.keys(ENGINE_LABELS) as AiEngineType[]).map((key) => (
            <option key={key} value={key} disabled={key === 'custom'}>
              {ENGINE_LABELS[key]}
            </option>
          ))}
        </select>
        <p className="tw-text-xs tw-text-gray-500 tw-mt-1">
          {ENGINE_DESCRIPTIONS[config.engine]}
        </p>
      </div>

      {/* Cloud engine settings (OpenAI / Claude / Gemini) */}
      {isCloudEngine && (
        <>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1.5">
              API Key
            </label>
            <div className="tw-flex tw-gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => updateField('apiKey', e.target.value)}
                placeholder={apiKeyPlaceholder}
                className="tw-flex-1 tw-rounded-md tw-border tw-border-gray-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="tw-px-3 tw-py-2 tw-text-sm tw-text-gray-500 hover:tw-text-gray-700 tw-border tw-border-gray-300 tw-rounded-md"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="tw-text-xs tw-text-gray-500 tw-mt-1">
              Your API key is stored locally and never shared.
            </p>
          </div>

          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1.5">
              Model
            </label>
            {modelsLoading ? (
              <div className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-text-gray-400 tw-py-2">
                <div className="tw-h-4 tw-w-4 tw-animate-spin tw-rounded-full tw-border-2 tw-border-gray-300 tw-border-t-blue-500" />
                Loading models...
              </div>
            ) : (
              <select
                value={config.model}
                onChange={(e) => updateField('model', e.target.value)}
                className="tw-w-full tw-rounded-md tw-border tw-border-gray-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm focus:tw-border-blue-500 focus:tw-ring-1 focus:tw-ring-blue-500"
              >
                {availableModels.length > 0 ? (
                  availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))
                ) : (
                  <option value={config.model}>{config.model}</option>
                )}
              </select>
            )}
            {modelsError && (
              <p className="tw-text-xs tw-text-amber-600 tw-mt-1">
                {modelsError}
              </p>
            )}
            <p className="tw-text-xs tw-text-gray-500 tw-mt-1">
              Model list is fetched live from the{' '}
              {config.engine === 'openai'
                ? 'OpenAI'
                : config.engine === 'claude'
                  ? 'Anthropic'
                  : 'Google Gemini'}{' '}
              API. New models appear automatically.
            </p>
          </div>
        </>
      )}

      {/* Auto-moderation Toggle (available for local, openai, claude, and gemini) */}
      {config.engine !== 'none' && (
        <>
          <div className="tw-flex tw-items-center tw-justify-between tw-py-2">
            <div>
              <span className="tw-text-sm tw-font-medium tw-text-gray-700">
                Auto-moderation
              </span>
              <p className="tw-text-xs tw-text-gray-500">
                Automatically moderate content using AI without manual review.
              </p>
            </div>
            <label className="tw-relative tw-inline-flex tw-items-center tw-cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoModerate}
                onChange={(e) => updateField('autoModerate', e.target.checked)}
                className="tw-sr-only tw-peer"
              />
              <div className="tw-w-9 tw-h-5 tw-bg-gray-200 peer-focus:tw-outline-none peer-focus:tw-ring-2 peer-focus:tw-ring-blue-300 tw-rounded-full peer peer-checked:after:tw-translate-x-full peer-checked:tw-bg-blue-600 after:tw-content-[''] after:tw-absolute after:tw-top-[2px] after:tw-left-[2px] after:tw-bg-white after:tw-border-gray-300 after:tw-border after:tw-rounded-full after:tw-h-4 after:tw-w-4 after:tw-transition-all" />
            </label>
          </div>

          {/* Spam Threshold */}
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1.5">
              Spam Threshold: {config.spamThreshold}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.spamThreshold}
              onChange={(e) =>
                updateField('spamThreshold', Number(e.target.value))
              }
              className="tw-w-full"
            />
            <div className="tw-flex tw-justify-between tw-text-xs tw-text-gray-400">
              <span>Lenient (0)</span>
              <span>Strict (100)</span>
            </div>
            <p className="tw-text-xs tw-text-gray-500 tw-mt-1">
              Content with spam score above this threshold will be
              auto-moderated.
            </p>
          </div>

          {/* Additional toggles */}
          <div className="tw-space-y-3">
            <div className="tw-flex tw-items-center tw-justify-between">
              <span className="tw-text-sm tw-text-gray-700">
                Language Detection
              </span>
              <label className="tw-relative tw-inline-flex tw-items-center tw-cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableLanguageDetection}
                  onChange={(e) =>
                    updateField('enableLanguageDetection', e.target.checked)
                  }
                  className="tw-sr-only tw-peer"
                />
                <div className="tw-w-9 tw-h-5 tw-bg-gray-200 peer-focus:tw-outline-none peer-focus:tw-ring-2 peer-focus:tw-ring-blue-300 tw-rounded-full peer peer-checked:after:tw-translate-x-full peer-checked:tw-bg-blue-600 after:tw-content-[''] after:tw-absolute after:tw-top-[2px] after:tw-left-[2px] after:tw-bg-white after:tw-border-gray-300 after:tw-border after:tw-rounded-full after:tw-h-4 after:tw-w-4 after:tw-transition-all" />
              </label>
            </div>

            <div className="tw-flex tw-items-center tw-justify-between">
              <span className="tw-text-sm tw-text-gray-700">
                Sentiment Analysis
              </span>
              <label className="tw-relative tw-inline-flex tw-items-center tw-cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableSentimentAnalysis}
                  onChange={(e) =>
                    updateField('enableSentimentAnalysis', e.target.checked)
                  }
                  className="tw-sr-only tw-peer"
                />
                <div className="tw-w-9 tw-h-5 tw-bg-gray-200 peer-focus:tw-outline-none peer-focus:tw-ring-2 peer-focus:tw-ring-blue-300 tw-rounded-full peer peer-checked:after:tw-translate-x-full peer-checked:tw-bg-blue-600 after:tw-content-[''] after:tw-absolute after:tw-top-[2px] after:tw-left-[2px] after:tw-bg-white after:tw-border-gray-300 after:tw-border after:tw-rounded-full after:tw-h-4 after:tw-w-4 after:tw-transition-all" />
              </label>
            </div>
          </div>
        </>
      )}

      {/* Disabled state info */}
      {config.engine === 'none' && (
        <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4 tw-text-sm tw-text-gray-500">
          Select an AI engine above to configure AI-powered moderation features.
        </div>
      )}
    </div>
  )
}
