/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#f2ead9',
        moss: '#8fae78',
        lake: '#76a7ad',
        sun: '#d4a251',
        clay: '#c17755',
        trail: '#b7a17d',
        paper: '#1f2a25',
        soil: '#121a17',
        canopy: '#26372e',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
