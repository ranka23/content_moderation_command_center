import React from 'react'
import { useOnlineStatus } from '../../lib/useOnlineStatus'
import { cn } from '../../lib/cn'

export interface OfflineBannerProps {
  className?: string
}

/**
 * OfflineBanner displays a fixed banner at the top of the page when
 * the browser detects a network disconnection.
 * Automatically hides when the connection is restored.
 */
export function OfflineBanner({
  className,
}: OfflineBannerProps): React.ReactElement | null {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="alert"
      className={cn(
        'tw-fixed tw-top-0 tw-left-0 tw-right-0 tw-z-[9999]',
        'tw-bg-amber-500 tw-text-white',
        'tw-px-4 tw-py-2',
        'tw-flex tw-items-center tw-justify-center tw-gap-2',
        'tw-text-sm tw-font-medium',
        'tw-shadow-lg',
        'tw-animate-slide-down',
        className,
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>You are offline. Changes cannot be saved until the connection is restored.</span>
      <button
        onClick={() => window.location.reload()}
        className="tw-text-white tw-underline hover:tw-no-underline tw-text-xs tw-ml-2"
      >
        Retry
      </button>
    </div>
  )
}

export default OfflineBanner
