import React from 'react'
import { cn } from '../../lib/cn'

export interface AiSpamScoreDisplay {
  score: number
  confidence: number
  reason: string
  factors?: Array<{ name: string; score: number; weight: number }>
}

export interface AiLanguageDisplay {
  language: string
  confidence: number
  languageName: string
}

export interface AiSentimentDisplay {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  score: number
  toxicityScore: number
  isToxic: boolean
}

export interface AiEvaluationResultData {
  spamScore: AiSpamScoreDisplay
  language?: AiLanguageDisplay
  sentiment?: AiSentimentDisplay
  recommendedAction: 'approve' | 'flag' | 'spam' | 'discard'
  processingTimeMs: number
  engine: string
}

export interface AiEvaluationResultProps {
  result: AiEvaluationResultData
  isLoading?: boolean
  error?: string | null
  onReEvaluate?: () => void
  className?: string
}

function getScoreColor(score: number): string {
  if (score < 30) return 'tw-text-green-600'
  if (score < 60) return 'tw-text-amber-600'
  return 'tw-text-red-600'
}

function getScoreBg(score: number): string {
  if (score < 30) return 'tw-bg-green-50 tw-border-green-200'
  if (score < 60) return 'tw-bg-amber-50 tw-border-amber-200'
  return 'tw-bg-red-50 tw-border-red-200'
}

function getActionBadge(action: string): { label: string; color: string } {
  switch (action) {
    case 'approve':
      return { label: 'Approve', color: 'tw-bg-green-100 tw-text-green-800' }
    case 'flag':
      return { label: 'Flag for Review', color: 'tw-bg-amber-100 tw-text-amber-800' }
    case 'spam':
      return { label: 'Mark as Spam', color: 'tw-bg-red-100 tw-text-red-800' }
    case 'discard':
      return { label: 'Discard', color: 'tw-bg-gray-100 tw-text-gray-800' }
    default:
      return { label: action, color: 'tw-bg-gray-100 tw-text-gray-800' }
  }
}

function SpamGauge({ score }: { score: number }): React.ReactElement {
  const clampedScore = Math.max(0, Math.min(100, score))
  const color = clampedScore < 30 ? 'tw-bg-green-500' : clampedScore < 60 ? 'tw-bg-amber-500' : 'tw-bg-red-500'

  return (
    <div className="tw-flex tw-items-center tw-gap-3">
      <div className="tw-flex-1 tw-h-2 tw-bg-gray-200 tw-rounded-full tw-overflow-hidden">
        <div
          className={`tw-h-full tw-rounded-full tw-transition-all ${color}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      <span className={`tw-text-lg tw-font-bold ${getScoreColor(clampedScore)}`}>
        {Math.round(clampedScore)}
      </span>
    </div>
  )
}

export function AiEvaluationResult({
  result,
  isLoading = false,
  error = null,
  onReEvaluate,
  className,
}: AiEvaluationResultProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className={cn('tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-p-4', className)}>
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-h-5 tw-w-5 tw-animate-spin tw-rounded-full tw-border-2 tw-border-gray-300 tw-border-t-blue-600" />
          <span className="tw-text-sm tw-text-gray-500">Analyzing content with AI...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('tw-bg-red-50 tw-rounded-lg tw-border tw-border-red-200 tw-p-4', className)}>
        <div className="tw-flex tw-items-center tw-justify-between">
          <div>
            <p className="tw-text-sm tw-font-medium tw-text-red-800">AI Evaluation Failed</p>
            <p className="tw-text-xs tw-text-red-600 tw-mt-0.5">{error}</p>
          </div>
          {onReEvaluate && (
            <button
              onClick={onReEvaluate}
              className="tw-text-xs tw-text-red-700 hover:tw-text-red-900 tw-underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  const actionBadge = getActionBadge(result.recommendedAction)

  return (
    <div className={cn('tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-divide-y tw-divide-gray-100', className)}>
      {/* Header */}
      <div className="tw-px-4 tw-py-3 tw-flex tw-items-center tw-justify-between">
        <span className="tw-text-sm tw-font-semibold tw-text-gray-700">
          🤖 AI Moderation Result
        </span>
        <div className="tw-flex tw-items-center tw-gap-2">
          <span className="tw-text-xs tw-text-gray-400">
            {result.engine} · {result.processingTimeMs}ms
          </span>
          {onReEvaluate && (
            <button
              onClick={onReEvaluate}
              className="tw-text-xs tw-text-blue-600 hover:tw-text-blue-800"
            >
              Re-evaluate
            </button>
          )}
        </div>
      </div>

      {/* Recommended Action */}
      <div className={cn('tw-px-4 tw-py-3', getScoreBg(result.spamScore.score))}>
        <div className="tw-flex tw-items-center tw-justify-between">
          <span className="tw-text-sm tw-text-gray-600">Recommended Action</span>
          <span className={`tw-text-xs tw-font-semibold tw-px-2 tw-py-0.5 tw-rounded-full ${actionBadge.color}`}>
            {actionBadge.label}
          </span>
        </div>
      </div>

      {/* Spam Score */}
      <div className="tw-px-4 tw-py-3">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
          <span className="tw-text-sm tw-text-gray-600">Spam Score</span>
          <span className="tw-text-xs tw-text-gray-400">
            Confidence: {Math.round(result.spamScore.confidence * 100)}%
          </span>
        </div>
        <SpamGauge score={result.spamScore.score} />
        {result.spamScore.reason && (
          <p className="tw-text-xs tw-text-gray-500 tw-mt-1.5">{result.spamScore.reason}</p>
        )}
      </div>

      {/* Factors */}
      {result.spamScore.factors && result.spamScore.factors.length > 0 && (
        <div className="tw-px-4 tw-py-3">
          <span className="tw-text-xs tw-font-medium tw-text-gray-500 tw-mb-1.5 tw-block">
            Scoring Factors
          </span>
          <div className="tw-space-y-1">
            {result.spamScore.factors.map((f, i) => (
              <div key={i} className="tw-flex tw-items-center tw-justify-between tw-text-xs">
                <span className="tw-text-gray-600">{f.name}</span>
                <span className={getScoreColor(f.score)}>{Math.round(f.score)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language & Sentiment */}
      {(result.language || result.sentiment) && (
        <div className="tw-px-4 tw-py-3 tw-grid tw-grid-cols-2 tw-gap-4">
          {result.language && (
            <div>
              <span className="tw-text-xs tw-font-medium tw-text-gray-500 tw-block tw-mb-0.5">
                Language
              </span>
              <span className="tw-text-sm tw-text-gray-700">
                {result.language.languageName} ({result.language.language})
              </span>
            </div>
          )}
          {result.sentiment && (
            <div>
              <span className="tw-text-xs tw-font-medium tw-text-gray-500 tw-block tw-mb-0.5">
                Sentiment
              </span>
              <span className="tw-text-sm tw-text-gray-700 tw-capitalize">
                {result.sentiment.sentiment}
                {result.sentiment.isToxic && (
                  <span className="tw-ml-1 tw-text-xs tw-bg-red-100 tw-text-red-700 tw-px-1.5 tw-py-0.5 tw-rounded">
                    Toxic
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
