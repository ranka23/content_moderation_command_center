import React from 'react'
import { Button, type ButtonProps } from '../ui/Button'

/**
 * ActionButton — simple button wrapper used by platform apps.
 * Delegates to the shared Button component (same props: variant, size, loading, onClick, etc.)
 */
export type ActionButtonProps = ButtonProps

export const ActionButton: React.FC<ActionButtonProps> = (props) => {
  return <Button {...props} />
}

ActionButton.displayName = 'ActionButton'
