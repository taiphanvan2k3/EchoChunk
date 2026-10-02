/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        duo: {
          DEFAULT: '#1cb0f6',
          hover: '#28b9ff',
          active: '#1899d6',
          dark: '#1899d6',
        },
        notion: {
          app: 'var(--bg-app)',
          surface: {
            DEFAULT: 'var(--bg-surface)',
            subtle: 'var(--bg-surface-subtle)',
          },
          'surface-subtle': 'var(--bg-surface-subtle)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
          card: {
            DEFAULT: 'var(--bg-card)',
            subtle: 'var(--bg-card-subtle)',
          },
          'card-subtle': 'var(--bg-card-subtle)',
          border: {
            DEFAULT: 'var(--border-subtle)',
            medium: 'var(--border-medium)',
            focus: 'var(--border-focus)',
          },
          'border-medium': 'var(--border-medium)',
          'border-focus': 'var(--border-focus)',
          text: {
            DEFAULT: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            muted: 'var(--text-muted)',
          },
          // Direct aliases for text colors
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',

          // Brand & Primary CTA
          primary: {
            DEFAULT: '#2383e2',
            hover: '#1d72c6',
            light: '#e8f4fd',
            dark: '#0b6e99',
          },
          // Secondary button colors
          btn: {
            secondary: '#f7f6f3',
            'secondary-hover': '#ededeb',
            'secondary-border': 'rgba(55, 53, 47, 0.14)',
          },
          // Notion Pastel Accents (supporting bg-notion-blue-bg, text-notion-blue-text, etc.)
          blue: {
            DEFAULT: '#2383e2',
            hover: '#1d72c6',
            bg: 'var(--notion-blue-bg)',
            border: 'var(--notion-blue-border)',
            text: 'var(--notion-blue-text)',
          },
          green: {
            DEFAULT: '#0f7b6c',
            bg: 'var(--notion-green-bg)',
            border: 'var(--notion-green-border)',
            text: 'var(--notion-green-text)',
          },
          yellow: {
            DEFAULT: '#96680a',
            bg: 'var(--notion-yellow-bg)',
            border: 'var(--notion-yellow-border)',
            text: 'var(--notion-yellow-text)',
          },
          purple: {
            DEFAULT: '#6940a5',
            bg: 'var(--notion-purple-bg)',
            border: 'var(--notion-purple-border)',
            text: 'var(--notion-purple-text)',
          },
          red: {
            DEFAULT: '#eb5757',
            hover: '#d43838',
            bg: 'var(--notion-red-bg)',
            border: 'var(--notion-red-border)',
            text: 'var(--notion-red-text)',
          },
          orange: {
            DEFAULT: '#d9730d',
            bg: 'var(--notion-orange-bg)',
            border: 'var(--notion-orange-border)',
            text: 'var(--notion-orange-text)',
          },
          code: {
            bg: 'var(--notion-code-bg)',
            text: 'var(--notion-code-text)',
          },
          // Aliases for notion-pastel-*
          pastel: {
            blue: 'var(--notion-blue-bg)',
            'blue-border': 'var(--notion-blue-border)',
            'blue-text': 'var(--notion-blue-text)',
            green: 'var(--notion-green-bg)',
            'green-border': 'var(--notion-green-border)',
            'green-text': 'var(--notion-green-text)',
            yellow: 'var(--notion-yellow-bg)',
            'yellow-border': 'var(--notion-yellow-border)',
            'yellow-text': 'var(--notion-yellow-text)',
            purple: 'var(--notion-purple-bg)',
            'purple-border': 'var(--notion-purple-border)',
            'purple-text': 'var(--notion-purple-text)',
            red: 'var(--notion-red-bg)',
            'red-border': 'var(--notion-red-border)',
            'red-text': 'var(--notion-red-text)',
            orange: 'var(--notion-orange-bg)',
            'orange-border': 'var(--notion-orange-border)',
            'orange-text': 'var(--notion-orange-text)',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        serif: ['var(--font-serif)', 'serif'],
        ipa: ['var(--font-ipa)', 'sans-serif'],
      },
      boxShadow: {
        'notion-subtle': 'var(--shadow-subtle)',
        'notion-card': 'var(--shadow-card)',
        'notion-hover': 'var(--shadow-hover)',
        'notion-modal': 'var(--shadow-modal)',
      },
    },
  },
  plugins: [],
}
