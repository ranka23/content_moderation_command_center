import React, { useEffect } from 'react'

export interface ActionButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  className?: string
  type?: 'button' | 'submit'
}

const SPINNER_KEYFRAMES_ID = 'cmcc-action-button-spinner-keyframes'

function injectSpinnerKeyframes(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(SPINNER_KEYFRAMES_ID)) return

  const style = document.createElement('style')
  style.id = SPINNER_KEYFRAMES_ID
  style.textContent =
    '@keyframes cmcc-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
  document.head.appendChild(style)
}

const VARIANT_STYLES: Record<
  ActionButtonProps['variant'],
  React.CSSProperties
> = {
  primary: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: '1px solid #2563eb',
  },
  secondary: {
    backgroundColor: '#6b7280',
    color: '#ffffff',
    border: '1px solid #6b7280',
  },
  danger: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: '1px solid #dc2626',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '#374151',
    border: '1px solid transparent',
  },
}

const SIZE_STYLES: Record<ActionButtonProps['size'], React.CSSProperties> = {
  sm: {
    padding: '4px 12px',
    fontSize: '12px',
    borderRadius: '4px',
  },
  md: {
    padding: '8px 16px',
    fontSize: '14px',
    borderRadius: '6px',
  },
  lg: {
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '8px',
  },
}

export function ActionButton({
  variant,
  size,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  onClick,
  children,
  className,
  type = 'button',
}: ActionButtonProps): React.ReactElement {
  useEffect(() => {
    injectSpinnerKeyframes()
  }, [])

  const isDisabled = disabled || loading

  const handleClick = (): void => {
    if (!isDisabled && onClick) {
      onClick()
    }
  }

  const spinnerSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 16

  return (
    <button
      type={type}
      className={className}
      onClick={handleClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        fontWeight: 500,
        lineHeight: 1.4,
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
      }}
    >
      {loading ? (
        <span
          role="status"
          aria-label="Loading"
          style={{
            display: 'inline-block',
            width: `${spinnerSize}px`,
            height: `${spinnerSize}px`,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'cmcc-spin 0.6s linear infinite',
          }}
        />
      ) : icon && iconPosition === 'left' ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span aria-hidden="true">{icon}</span>
      )}
    </button>
  )
}

export default ActionButton
