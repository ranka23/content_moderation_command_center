import React, { useState, useEffect } from 'react'
import { Box, Typography, Button, Flex } from '@strapi/design-system'
import { Shield, BarChart3, ClipboardList, Keyboard, ListChecks } from 'lucide-react'

const STORAGE_KEY = 'cmcc-strapi-onboarding-dismissed'

const STEPS = [
  {
    title: 'Welcome to CMCC',
    description:
      'Content Moderation Command Center — your unified dashboard for managing content moderation across Strapi.',
    icon: 'shield',
  },
  {
    title: 'Moderation Queue',
    description:
      'Review and moderate content from the Queue tab. Select items and use bulk actions to approve, reject, or mark as spam.',
    icon: 'list-checks',
  },
  {
    title: 'Analytics & Reports',
    description:
      'Track moderation activity with analytics, view activity logs, and generate detailed CSV reports for compliance auditing.',
    icon: 'chart',
  },
  {
    title: 'Keyboard Shortcuts',
    description:
      'Press ? to view all keyboard shortcuts. Approve (A), Reject (R), Spam (S), Defer (D), and more — all from your keyboard.',
    icon: 'keyboard',
  },
  {
    title: 'Settings',
    description:
      'Configure auto-moderation rules, AI-powered content evaluation, notifications, and connect your Strapi instance.',
    icon: 'settings',
  },
]

/**
 * OnboardingWizard — A step-by-step welcome overlay shown on first visit.
 * Walks through CMCC features. Dismissal is persisted in localStorage.
 *
 * @returns {React.ReactElement|null}
 */
export default function OnboardingWizard() {
  const [visible, setVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 300)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // localStorage unavailable
    }
    setVisible(false)
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleDismiss()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (!visible) return null

  const step = STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === STEPS.length - 1

  const renderIcon = () => {
    const size = 48
    switch (step.icon) {
      case 'shield':
        return <Shield size={size} />
      case 'list-checks':
        return <ListChecks size={size} />
      case 'chart':
        return <BarChart3 size={size} />
      case 'keyboard':
        return <Keyboard size={size} />
      default:
        return <ClipboardList size={size} />
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleDismiss}
    >
      <div
        style={{ maxWidth: 520, width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box background="neutral0" hasRadius>
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
                backgroundColor: '#4945FF',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
            <div style={{ marginBottom: 16, color: '#4945FF' }}>
              {renderIcon()}
            </div>
            <Typography
              variant="alpha"
              fontWeight="bold"
              style={{ margin: '0 0 8px', display: 'block' }}
            >
              {step.title}
            </Typography>
            <Typography
              variant="omega"
              textColor="neutral600"
              style={{ lineHeight: 1.6 }}
            >
              {step.description}
            </Typography>
          </div>

          {/* Step indicators */}
          <Flex justifyContent="center" gap={2} paddingBottom={4}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor:
                    i === currentStep ? '#4945FF' : '#d1d5db',
                  transition: 'background-color 0.2s',
                }}
              />
            ))}
          </Flex>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 24px 20px',
              borderTop: '1px solid #f3f4f6',
            }}
          >
            <Button variant="tertiary" size="S" onClick={handleDismiss}>
              Skip all
            </Button>

            <Flex gap={2}>
              {!isFirst && (
                <Button variant="tertiary" size="S" onClick={handlePrev}>
                  Back
                </Button>
              )}
              <Button onClick={handleNext} size="S">
                {isLast ? 'Get started' : 'Next'}
              </Button>
            </Flex>
          </div>
        </Box>
      </div>
    </div>
  )
}
