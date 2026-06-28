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
        /* ── Modern Indigo Primary (2026 aesthetic) ─────── */
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        /* ── Destructive/Semantic ───────────────────────── */
        destructive: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
        },
        success: {
          DEFAULT: '#10b981',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          DEFAULT: '#f59e0b',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        /* ── Neutral / Muted ────────────────────────────── */
        muted: {
          DEFAULT: '#f8fafc',
          foreground: '#94a3b8',
        },
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#6366f1',
        background: '#ffffff',
        foreground: '#0f172a',
        /* ── Dark mode semantic tones ───────────────────── */
        dark: {
          bg: '#0b1121',
          card: '#131c31',
          border: '#1e293b',
          text: '#e2e8f0',
          muted: '#64748b',
          surface: '#1a2332',
          accent: '#1e293b',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        card: '0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
        elevated:
          '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
        modal: '0 24px 48px rgba(0, 0, 0, 0.12)',
        glow: '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.1)',
      },
      animation: {
        'fade-in': 'cmcc-fade-in 0.3s ease',
        'slide-up': 'cmcc-slide-up 0.3s ease',
        'slide-down': 'cmcc-slide-down 0.2s ease',
        'scale-in': 'cmcc-scale-in 0.2s ease',
        'pulse-soft': 'cmcc-pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        'cmcc-slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'cmcc-slide-down': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'cmcc-scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'cmcc-pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
