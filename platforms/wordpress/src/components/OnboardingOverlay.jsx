import React, { useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

const STEPS = [
  {
    title: 'Review the Queue',
    desc: 'Go to the Queue tab to review pending content. Use filters and search to find specific items quickly.',
  },
  {
    title: 'Take Action',
    desc: 'Approve, reject, flag, or mark items as spam. Use keyboard shortcuts for faster moderation.',
  },
  {
    title: 'Configure Settings',
    desc: 'Set up spam firewall rules, auto-moderation, and notification preferences in the Settings tab.',
  },
  {
    title: 'View Analytics',
    desc: 'Monitor moderation activity, track spam ratios, and review moderator performance reports.',
  },
]

/**
 * Onboarding overlay with step-by-step walkthrough.
 * 2026 modern design with gradient accents, glass backdrop, and spring animations.
 */
export default function OnboardingOverlay({ onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0)
  const totalSteps = STEPS.length

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      onDismiss()
    }
  }, [currentStep, totalSteps, onDismiss])

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }, [currentStep])

  const progressPercent = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="cmcc-onboarding-overlay">
      <div className="cmcc-onboarding-card" style={{ position: 'relative' }}>
        <button
          className="cmcc-onboarding-skip"
          onClick={onDismiss}
          title="Skip onboarding"
          aria-label="Skip onboarding"
        >
          <X size={18} />
        </button>

        <div className="tw-flex tw-items-center tw-gap-4 tw-mb-6">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--cmcc-radius-xl)',
              background: 'var(--cmcc-gradient-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--cmcc-shadow-glow-sm)',
            }}
          >
            <Sparkles size={22} className="tw-text-white" />
          </div>
          <div>
            <h3
              className="tw-text-xl tw-font-bold tw-m-0"
              style={{ color: 'var(--cmcc-text-heading)' }}
            >
              Welcome to CMCC
            </h3>
            <p
              className="tw-text-xs tw-m-0 tw-mt-0.5"
              style={{ color: 'var(--cmcc-text-tertiary)' }}
            >
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
        </div>

        <div className="cmcc-onboarding-steps">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={`cmcc-onboarding-step${
                i === currentStep
                  ? ' active'
                  : i < currentStep
                    ? ' completed'
                    : ''
              }`}
              onClick={() => setCurrentStep(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setCurrentStep(i)
              }}
            >
              <span className="cmcc-onboarding-step-number">
                {i < currentStep ? '✓' : i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <strong>{s.title}</strong>
                {i === currentStep && <p>{s.desc}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="cmcc-onboarding-progress">
          <div
            className="cmcc-onboarding-progress-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className="cmcc-btn cmcc-btn-secondary"
            style={{
              opacity: currentStep === 0 ? 0.4 : 1,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="tw-flex tw-gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className="tw-rounded-full tw-transition-all"
                style={{
                  width: i === currentStep ? 24 : 8,
                  height: 8,
                  background:
                    i === currentStep
                      ? 'var(--cmcc-gradient-primary)'
                      : i < currentStep
                        ? 'var(--cmcc-primary-300)'
                        : 'var(--cmcc-bg-tertiary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <button onClick={goNext} className="cmcc-btn cmcc-btn-primary">
            {currentStep < totalSteps - 1 ? (
              <>
                Next
                <ChevronRight size={16} />
              </>
            ) : (
              'Get Started →'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
