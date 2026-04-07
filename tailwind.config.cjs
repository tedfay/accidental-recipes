/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: 'var(--color-canvas)',
          raised: 'var(--color-canvas-raised)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          secondary: 'var(--color-ink-secondary)',
          muted: 'var(--color-ink-muted)',
        },
        sage: {
          DEFAULT: 'var(--color-sage)',
          light: 'var(--color-sage-light)',
          muted: 'var(--color-sage-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
        },
      },
      fontFamily: {
        display: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'content-gap': '1.5rem',
        'section-gap': '3rem',
        'page-gap': '4rem',
      },
      maxWidth: {
        content: '42rem',
        wide: '64rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
