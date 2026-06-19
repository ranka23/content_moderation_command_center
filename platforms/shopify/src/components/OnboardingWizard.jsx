/**
 * OnboardingWizard - Welcome overlay on first visit.
 * Dismissed by clicking "Get Started" and stored in localStorage.
 */

import React, { useState, useEffect, startTransition } from 'react'
import { Shield } from 'lucide-react'

const ONBOARDING_KEY = 'cmcc-shopify-onboarding-dismissed'

/**
 * Onboarding wizard overlay shown on first visit.
 * @returns {JSX.Element|null}
 */
export default function OnboardingWizard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    startTransition(() => {
      try {
        const dismissed = localStorage.getItem(ONBOARDING_KEY) === 'true'
        if (!dismissed) {
          setVisible(true)
        }
      } catch {
        setVisible(true)
      }
    })
  }, [])

  function handleDismiss() {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true')
    } catch {
      // localStorage unavailable
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="cmcc-onboarding-overlay">
      <div className="cmcc-onboarding-modal">
        <div className="cmcc-onboarding-content">
          <div className="cmcc-onboarding-icon">
            <Shield size={24} />
          </div>
          <h2 className="cmcc-onboarding-title">
            Welcome to CMCC Content Moderation
          </h2>
          <p className="cmcc-onboarding-description">
            Your all-in-one content moderation command center for Shopify.
            Manage your moderation queue, review analytics, generate reports,
            and collaborate with your team — all from one place.
          </p>

          <div className="cmcc-onboarding-steps">
            <div className="cmcc-onboarding-step">
              <span className="cmcc-onboarding-step-num">1</span>
              <div>
                <strong>Queue</strong>
                <p>Review and moderate incoming content</p>
              </div>
            </div>
            <div className="cmcc-onboarding-step">
              <span className="cmcc-onboarding-step-num">2</span>
              <div>
                <strong>Analytics</strong>
                <p>Track spam ratios and content breakdowns</p>
              </div>
            </div>
            <div className="cmcc-onboarding-step">
              <span className="cmcc-onboarding-step-num">3</span>
              <div>
                <strong>Reports</strong>
                <p>Export CSV reports and audit compliance</p>
              </div>
            </div>
            <div className="cmcc-onboarding-step">
              <span className="cmcc-onboarding-step-num">4</span>
              <div>
                <strong>Settings</strong>
                <p>Configure auto-moderation, notifications, and more</p>
              </div>
            </div>
          </div>

          <div className="cmcc-onboarding-actions">
            <button className="cmcc-onboarding-btn" onClick={handleDismiss}>
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
