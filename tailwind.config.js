/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#030706',
          panel: '#090F0D',
          card: '#111916',
          border: '#1E2C26',
          'border-active': '#2B3F37',
          green: '#0DF289',
          'green-glow': 'rgba(13, 242, 137, 0.25)',
          red: '#E5484D',
          'red-glow': 'rgba(229, 72, 77, 0.25)',
          amber: '#F5A623',
          cyan: '#00E5FF',
          muted: '#6E7A75',
          text: '#D8E2DC'
        }
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
