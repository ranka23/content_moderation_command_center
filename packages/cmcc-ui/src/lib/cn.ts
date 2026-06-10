import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS class names with proper conflict resolution.
 */
export function cn(...inputs: Parameters<typeof clsx>): string {
  return twMerge(clsx(inputs))
}
