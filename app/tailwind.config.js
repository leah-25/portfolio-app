/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      // ── Color tokens ────────────────────────────────────────────────────────
      colors: {
        // Surface hierarchy — three levels of elevation on a dark zinc base
        surface: {
          DEFAULT: '#18181b', // zinc-900  — page background
          raised:  '#1f1f23', // ~zinc-850 — cards, panels
          overlay: '#27272a', // zinc-800  — modals, drawers, popovers
          border:  '#3f3f46', // zinc-700  — dividers, input borders
          muted:   '#52525b', // zinc-600  — disabled, placeholder bg
        },
        // Text hierarchy
        text: {
          primary:   '#fafafa', // zinc-50
          secondary: '#a1a1aa', // zinc-400
          muted:     '#71717a', // zinc-500
          inverse:   '#18181b', // for text on light backgrounds
        },
        // Accent — indigo; single, restrained
        accent: {
          DEFAULT: '#6366f1', // indigo-500
          hover:   '#4f46e5', // indigo-600
          subtle:  '#1e1b4b', // indigo-950 — very dark tint for bg
          muted:   '#312e81', // indigo-900
          border:  '#4338ca', // indigo-700
        },
        // Semantic
        gain: {
          DEFAULT: '#10b981', // emerald-500
          subtle:  '#052e16', // emerald-950
          text:    '#34d399', // emerald-400
          border:  '#059669', // emerald-600
        },
        loss: {
          DEFAULT: '#f43f5e', // rose-500
          subtle:  '#4c0519', // rose-950
          text:    '#fb7185', // rose-400
          border:  '#e11d48', // rose-600
        },
        warn: {
          DEFAULT: '#f59e0b', // amber-500
          subtle:  '#1c0a00', // near amber-950
          text:    '#fbbf24', // amber-400
          border:  '#d97706', // amber-600
        },
      },

      // ── Typography ──────────────────────────────────────────────────────────
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
      },

      // ── Spacing ─────────────────────────────────────────────────────────────
      // Use Tailwind defaults; just add one named spacing
      spacing: {
        'page': '1.5rem',      // 24px — standard page padding
        'page-lg': '2rem',     // 32px — wide viewport page padding
      },

      // ── Border radius ───────────────────────────────────────────────────────
      borderRadius: {
        card:   '0.625rem', // 10px
        drawer: '0.75rem',  // 12px
      },

      // ── Shadows — dark-mode aware ────────────────────────────────────────────
      boxShadow: {
        // Subtle lifted card
        card:       '0 1px 2px 0 rgb(0 0 0 / 0.5)',
        'card-md':  '0 2px 8px 0 rgb(0 0 0 / 0.5)',
        'card-lg':  '0 8px 24px 0 rgb(0 0 0 / 0.6)',
        // Focus ring handled via outline, not shadow
      },

      // ── Animations ──────────────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to:   { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':          'fade-in 0.18s ease-out',
        'fade-up':          'fade-up 0.22s ease-out',
        'slide-in-right':   'slide-in-right 0.22s cubic-bezier(0.16,1,0.3,1)',
        'slide-in-left':    'slide-in-left 0.22s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
