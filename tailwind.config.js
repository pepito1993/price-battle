/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/client/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'pyth-purple': '#7142CF',
        'pyth-purple-light': '#9B6FE8',
        'pyth-bg': '#0f0f1a',
        'pyth-surface': '#16213e',
        'pyth-surface-light': '#1f2b47',
        'pyth-border': '#2a3a5c',
        'pyth-green': '#00ff88',
        'pyth-red': '#ff4466',
        'pyth-text': '#e0e0e0',
        'pyth-text-dim': '#8899aa',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
