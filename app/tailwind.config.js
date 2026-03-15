/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Neutral base — zinc feels warmer than slate for financial UIs
        surface: {
          DEFAULT: '#18181b', // zinc-900 — page background
          raised: '#1f1f23',  // slightly lighter — card/panel background
          overlay: '#27272a', // zinc-800 — modals, drawers
          border: '#3f3f46',  // zinc-700 — borders
          muted: '#52525b',   // zinc-600 — disabled / subtle
        },
        text: {
          primary: '#fafafa',   // zinc-50
          secondary: '#a1a1aa', // zinc-400
          muted: '#71717a',     // zinc-500
        },
        // Single accent — indigo works well for financial/data UIs
        accent: {
          DEFAULT: '#6366f1', // indigo-500
          hover: '#4f46e5',   // indigo-600
          subtle: '#312e81',  // indigo-900 — tinted backgrounds
          muted: '#3730a3',   // indigo-800
        },
        // Semantic — gain / loss / neutral
        gain: {
          DEFAULT: '#10b981', // emerald-500
          subtle: '#064e3b',  // emerald-900
          text: '#34d399',    // emerald-400
        },
        loss: {
          DEFAULT: '#f43f5e', // rose-500
          subtle: '#4c0519',  // rose-950
          text: '#fb7185',    // rose-400
        },
        warn: {
          DEFAULT: '#f59e0b', // amber-500
          subtle: '#451a03',  // amber-950
          text: '#fbbf24',    // amber-400
        },
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '0.75rem',
        drawer: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.5)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
