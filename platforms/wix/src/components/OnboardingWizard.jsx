import React, { useState, useEffect } from 'react'
import { BarChart3, ClipboardList, Globe, Keyboard, Hand } from 'lucide-react'

/**
 * @typedef {Object} OnboardingStep
 * @property {string} title - Step title
 * @property {string} description - Step description
 * @property {string} [icon] - Emoji icon for the step
 */

/** @type {OnboardingStep[]} */
const STEPS = [
  {
    title: 'Welcome to CMCC',
    description:
      'Content Moderation Command Center — your unified dashboard for managing moderation across all your platforms.',
    icon: 'hand',
  },
  {
    title: 'Moderation Queue',
    description:
      'Review and moderate content from the Queue tab. Use the quick filters to find items from the last hour, today, or this week.',
    icon: 'clipboard',
  },
  {
    title: 'Analytics & Reports',
    description:
      'Track moderation activity with the Analytics heatmap and generate detailed reports including CSV exports and compliance audits.',
    icon: 'chart',
  },
  {
    title: 'Keyboard Shortcuts',
    description:
      'Press ? to view all keyboard shortcuts. Approve (A), Reject (R), Spam (S), Defer (D), and more — all from your keyboard.',
    icon: 'keyboard',
  },
  {
    title: 'Multi-Platform Hub',
    description:
      'Connect WordPress, Shopify, Storyblok, Strapi, and Wix. Manage all your platforms from a single dashboard.',
    icon: 'globe',
  },
]

/** Key used in localStorage to track if onboarding has been completed. */
const STORAGE_KEY = 'cmcc-wix-onboarding-done'

/**
 * OnboardingWizard — A step-by-step welcome overlay shown on first visit.
 *
 * Walks the user through the main features of CMCC. Dismissing the wizard
 * sets a flag in localStorage so it won't appear again.
 *
 * @returns {React.ReactElement|null}
 */
export function OnboardingWizard() {
  const [visible, setVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      // Small delay so the app renders first
      const timer = setTimeout(() => setVisible(true), 300)
      return () => clearTimeout(timer)
    }
  }, [])

  /** Dismiss the wizard permanently. */
  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }

  /** Go to the next step or dismiss on the last step. */
  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleDismiss()
    }
  }

  /** Go to the previous step. */
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (!visible) return null

  const step = STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  return (
    <div
      className="cmcc-modal-overlay"
      style={{ zIndex: 9999 }}
      onClick={handleDismiss}
    >
      <div
        className="cmcc-shortcuts-modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          style={{
            height: 4,
            backgroundColor: '#e5e7eb',
            borderRadius: '4px 4px 0 0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${((currentStep + 1) / STEPS.length) * 100}%`,
              backgroundColor: '#3b82f6',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            {step.icon === 'hand' && <Hand size={48} />}
            {step.icon === 'clipboard' && <ClipboardList size={48} />}
            {step.icon === 'chart' && <BarChart3 size={48} />}
            {step.icon === 'keyboard' && <Keyboard size={48} />}
            {step.icon === 'globe' && <Globe size={48} />}
          </div>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 20,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            {step.title}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: '#6b7280',
              lineHeight: 1.6,
            }}
          >
            {step.description}
          </p>
        </div>

        {/* Step indicators */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '0 24px 16px',
          }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: i === currentStep ? '#3b82f6' : '#d1d5db',
                transition: 'background-color 0.2s',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 24px 20px',
            borderTop: '1px solid #f3f4f6',
          }}
        >
          <button
            className="cmcc-btn-secondary"
            onClick={handleDismiss}
            style={{ fontSize: 13, padding: '6px 16px' }}
          >
            Skip all
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button
                className="cmcc-btn-secondary"
                onClick={handlePrev}
                style={{ fontSize: 13, padding: '6px 16px' }}
              >
                Back
              </button>
            )}
            <button
              className="cmcc-btn-primary"
              onClick={handleNext}
              style={{ fontSize: 13, padding: '6px 20px' }}
            >
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingWizard
