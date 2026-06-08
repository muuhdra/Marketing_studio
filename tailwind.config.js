/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // ── Couleurs ──────────────────────────────────────────
      colors: {
        bg: {
          base:     '#0a0a0f',
          surface:  '#0f0f18',
          card:     '#111119',
          elevated: '#161622',
          overlay:  '#1c1c2a',
        },
        accent:  '#c8f55a',
        purple:  '#a09ae0',
        teal:    '#5dcaa5',
        coral:   '#f0997b',
        amber:   '#ef9f27',
        pink:    '#ed93b1',
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong:  'rgba(255,255,255,0.16)',
          accent:  '#c8f55a',
          purple:  'rgba(160,154,224,0.4)',
          teal:    'rgba(93,202,165,0.4)',
          coral:   'rgba(240,153,123,0.4)',
        },
        text: {
          primary:   '#e8e4dc',
          secondary: '#8888a4',
          muted:     '#5a5a72',
          dim:       '#44445a',
          accent:    '#c8f55a',
        },
      },

      // ── Typographie ───────────────────────────────────────
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },

      // ── Ombres Neo-Brutalism ──────────────────────────────
      // Ombres dures, pas de flou, offset visible
      boxShadow: {
        'neo':          '3px 3px 0px rgba(200,245,90,0.45)',
        'neo-sm':       '2px 2px 0px rgba(200,245,90,0.45)',
        'neo-lg':       '5px 5px 0px rgba(200,245,90,0.45)',
        'neo-solid':    '4px 4px 0px #c8f55a',
        'neo-white':    '3px 3px 0px rgba(255,255,255,0.12)',
        'neo-white-sm': '2px 2px 0px rgba(255,255,255,0.12)',
        'neo-purple':   '3px 3px 0px rgba(160,154,224,0.45)',
        'neo-teal':     '3px 3px 0px rgba(93,202,165,0.45)',
        'neo-coral':    '3px 3px 0px rgba(240,153,123,0.45)',
        'neo-amber':    '3px 3px 0px rgba(239,159,39,0.45)',
        'neo-inset':    'inset 2px 2px 0px rgba(0,0,0,0.4)',
        'none':         'none',
      },

      // ── Border radius Neo-Brutalism ───────────────────────
      borderRadius: {
        'neo':    '4px',
        'neo-md': '6px',
        'neo-lg': '8px',
        'neo-xl': '10px',
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
      },
      animation: {
        'fade-in':      'fade-in 0.2s ease-out',
        'slide-up':     'slide-up 0.25s ease-out',
        'slide-in':     'slide-in 0.25s ease-out',
        'pulse-dot':    'pulse-dot 2s ease-in-out infinite',
        'spin':         'spin 0.8s linear infinite',
        'shimmer':      'shimmer 1.5s ease-in-out infinite',
        'toast-shrink': 'toast-shrink 4s linear forwards',
      },
    },
  },
  plugins: [],
}
