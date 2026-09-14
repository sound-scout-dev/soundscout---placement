/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // SoundScout AI design system — keep in sync with the main platform.
        'ink-navy': '#12122B',
        paper: '#F7F5F1',
        'signal-amber': '#FFB020',
        'circuit-teal': '#1F8A70',
        slate: '#5C5C6E',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
}
