/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}', '../../packages/cmcc-ui/src/**/*.{ts,tsx}'],
  prefix: 'tw-',
  important: '#cmcc-app',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        destructive: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        muted: {
          DEFAULT: '#f5f5f5',
          foreground: '#737373',
        },
        border: '#e5e7eb',
        input: '#e5e7eb',
        ring: '#3b82f6',
        background: '#ffffff',
        foreground: '#1d2327',
        dark: {
          bg: '#1a1a2e',
          card: '#16213e',
          border: '#2a2a4a',
          text: '#e0e0e0',
          muted: '#6b7280',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
  plugins: [],
}
