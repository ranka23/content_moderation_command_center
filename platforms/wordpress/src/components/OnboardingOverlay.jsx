import React, { useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Shield } from 'lucide-react'

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
 * Supports prev/next navigation and a progress indicator.
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
      <div className="cmcc-onboarding-card">
        <button
          className="cmcc-onboarding-skip"
          onClick={onDismiss}
          title="Skip onboarding"
        >
          <X size={18} />
        </button>

        <div className="tw-flex tw-items-center tw-gap-3 tw-mb-4">
          <div className="tw-w-10 tw-h-10 tw-rounded-full tw-bg-primary-100 tw-flex tw-items-center tw-justify-center">
            <Shield size={20} className="tw-text-primary-600" />
          </div>
          <div>
            <h3 className="tw-text-lg tw-font-semibold tw-m-0">
              Welcome to CMCC
            </h3>
            <p className="tw-text-xs tw-text-gray-500 tw-m-0">
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
              <div>
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
            className={`tw-rounded tw-px-3 tw-py-2 tw-text-sm tw-transition-colors ${
              currentStep === 0
                ? 'tw-text-gray-300 tw-cursor-not-allowed'
                : 'tw-text-gray-600 hover:tw-bg-gray-100'
            }`}
          >
            <ChevronLeft size={16} className="tw-inline tw-mr-1" />
            Back
          </button>

          <div className="tw-flex tw-gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`tw-w-2 tw-h-2 tw-rounded-full tw-transition-all ${
                  i === currentStep
                    ? 'tw-w-6 tw-bg-primary-600'
                    : i < currentStep
                      ? 'tw-bg-primary-300'
                      : 'tw-bg-gray-300'
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className="tw-rounded tw-bg-primary-600 tw-text-white tw-px-4 tw-py-2 tw-text-sm hover:tw-bg-primary-700 tw-transition-colors"
          >
            {currentStep < totalSteps - 1 ? (
              <>
                Next
                <ChevronRight size={16} className="tw-inline tw-ml-1" />
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
