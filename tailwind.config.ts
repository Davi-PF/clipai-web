import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: 'var(--bg-deep)', // #061C2C (Oxford by Night)
          surface: 'var(--bg-surface)', // #193347 (Nato Blue)
          elevated: 'var(--bg-elevated)', // #334B60 (Blue Fedora)
        },
        border: {
          muted: 'var(--border-muted)', // #4F6478 (Prairie Denim)
        },
        text: {
          muted: 'var(--text-muted)', // #6C7F91 (Blue Prince)
          secondary: 'var(--text-secondary)', // #91A1B2 (Foghorn)
          primary: 'var(--text-primary)', // #B7C7D6 (Powder Soft Blue)
        },
        danger: {
          text: 'var(--color-danger-text)', // #F06A76
          DEFAULT: 'var(--color-danger-primary)', // #D93848
          surface: 'var(--color-danger-surface)', // #8C2332
        },
        warning: {
          DEFAULT: 'var(--color-warning-primary)', // #E8B04B
        },
        success: {
          DEFAULT: 'var(--color-success-primary)', // #2EB886
          surface: 'var(--color-success-surface)', // #1D6F56
        },
      },
      fontFamily: {
        display: ['var(--font-bebas-neue)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      fontSize: {
        'display-hero': ['2.25rem', { lineHeight: '1.0', letterSpacing: '0.06em' }],
        'display-lg': ['1.625rem', { lineHeight: '1.05', letterSpacing: '0.06em' }],
        'display-md': ['1.25rem', { lineHeight: '1.1', letterSpacing: '0.06em' }],
        'display-cta': ['1.0625rem', { lineHeight: '1.0', letterSpacing: '0.06em' }],
        'mono-body': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0em' }],
        'mono-meta': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
        'mono-badge': ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        bento: 'var(--radius-bento)',
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
    },
  },
  plugins: [],
};

export default config;
