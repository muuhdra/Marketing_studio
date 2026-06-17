/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // ── Couleurs ──────────────────────────────────────────
      colors: {
        bg: {
          base:     'rgb(var(--bg-base) / <alpha-value>)',
          surface:  'rgb(var(--bg-surface) / <alpha-value>)',
          card:     'rgb(var(--bg-card) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          overlay:  'rgb(var(--bg-overlay) / <alpha-value>)',
          input:    'rgb(var(--bg-input) / <alpha-value>)',
        },
        fg:      'rgb(var(--fg) / <alpha-value>)',
        accent:  'rgb(var(--accent) / <alpha-value>)',
        purple:  'rgb(var(--purple) / <alpha-value>)',
        teal:    'rgb(var(--teal) / <alpha-value>)',
        coral:   'rgb(var(--coral) / <alpha-value>)',
        amber:   'rgb(var(--amber) / <alpha-value>)',
        pink:    'rgb(var(--pink) / <alpha-value>)',
        green:   'rgb(var(--green) / <alpha-value>)',
        blue:    'rgb(var(--blue) / <alpha-value>)',
        border: {
          DEFAULT: 'rgb(var(--fg) / 0.09)',
          strong:  'rgb(var(--fg) / 0.16)',
          accent:  'rgb(var(--accent))',
          purple:  'rgb(var(--purple) / 0.4)',
          teal:    'rgb(var(--teal) / 0.4)',
          coral:   'rgb(var(--coral) / 0.4)',
          blue:    'rgb(var(--blue) / 0.4)',
          green:   'rgb(var(--green) / 0.4)',
        },
        text: {
          primary:   'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted:     'rgb(var(--text-muted) / <alpha-value>)',
          dim:       'rgb(var(--text-dim) / <alpha-value>)',
          faint:     'rgb(var(--text-faint) / <alpha-value>)',
          accent:    'rgb(var(--accent) / <alpha-value>)',
        },
      },

      // ── Typographie ───────────────────────────────────────
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      // ── Ombres douces (suivent le thème via variables CSS) ─
      boxShadow: {
        'neo':          'var(--shadow-neo)',
        'neo-sm':       'var(--shadow-neo-sm)',
        'neo-lg':       'var(--shadow-neo-lg)',
        'neo-solid':    'var(--shadow-neo-solid)',
        'neo-white':    'var(--shadow-neo-white)',
        'neo-white-sm': 'var(--shadow-neo-white)',
        'neo-purple':   'var(--shadow-neo-purple)',
        'neo-teal':     'var(--shadow-neo-teal)',
        'neo-coral':    'var(--shadow-neo-coral)',
        'neo-amber':    '0 8px 24px rgb(var(--amber) / 0.18)',
        'neo-inset':    'inset 0 1px 2px rgb(17 17 19 / 0.06)',
        'none':         'none',
      },

      backgroundImage: {
        'gradient-accent': 'var(--gradient-accent)',
      },

      // ── Border radius — arrondi doux moderne (HeyOz) ──────
      borderRadius: {
        'neo':    '10px',
        'neo-md': '12px',
        'neo-lg': '16px',
        'neo-xl': '22px',
      },

      // ── Animations ────────────────────────────────────────
      keyframes: {
        'fade-in':      { from: { opacity: '0' },                              to: { opacity: '1' } },
        'slide-up':     { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in':     { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'pulse-dot':    { '0%, 100%': { opacity: '1' },                        '50%': { opacity: '0.4' } },
        'spin':         { to: { transform: 'rotate(360deg)' } },
        'shimmer':      { '0%': { backgroundPosition: '-200% 0' },             '100%': { backgroundPosition: '200% 0' } },
        'toast-shrink': { from: { transform: 'scaleX(1)' },                    to: { transform: 'scaleX(0)' } },
        'pop-in':       { '0%': { transform: 'scale(0.6)', opacity: '0' },     '70%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'reveal':       { '0%': { opacity: '0', transform: 'scale(0.97) translateY(6px)' }, '60%': { opacity: '1', transform: 'scale(1.01) translateY(0)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'breathe':      { '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--accent) / 0)' }, '50%': { boxShadow: '0 0 0 4px rgb(var(--accent) / 0.14)' } },
      },
      animation: {
        'fade-in':      'fade-in 0.2s ease-out',
        'slide-up':     'slide-up 0.25s ease-out',
        'slide-in':     'slide-in 0.25s ease-out',
        'pulse-dot':    'pulse-dot 2s ease-in-out infinite',
        'spin':         'spin 0.8s linear infinite',
        'shimmer':      'shimmer 1.5s ease-in-out infinite',
        'toast-shrink': 'toast-shrink 4s linear forwards',
        'pop-in':       'pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'reveal':       'reveal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'breathe':      'breathe 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
