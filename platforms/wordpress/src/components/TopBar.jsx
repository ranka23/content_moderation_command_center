import React from 'react'
import { Shield, Moon, Sun, Heart } from 'lucide-react'
import { TABS } from '../lib/constants'

/**
 * Top bar with app title, breadcrumb indicator, theme toggle, and donate link.
 */
export default function TopBar({ theme, toggleTheme, activeTab }) {
  return (
    <div className="cmcc-top-bar">
      <div className="cmcc-top-bar-left">
        <h1 className="cmcc-title">
          <span className="cmcc-title-icon">
            <Shield size={20} />
          </span>
          CMCC{' '}
          <span className="cmcc-title-light">Content Moderation</span>
        </h1>
        {/* Breadcrumb / Page title indicator */}
        <span className="cmcc-page-indicator">
          <span className="cmcc-page-indicator-sep">/</span>
          <span className="cmcc-page-indicator-label">
            {TABS.find((t) => t.id === activeTab)?.label || activeTab}
          </span>
        </span>
      </div>
      <div className="cmcc-top-bar-right">
        <button
          className="cmcc-theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <a
          className="cmcc-donate-link"
          href="https://rzp.io/rzp/IbvR3pMx"
          target="_blank"
          rel="noopener noreferrer"
          title="Support the creator — Donate $1"
        >
          <Heart size={14} /> Donate $1
        </a>
      </div>
    </div>
  )
}
