/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#24302b',
        moss: '#4f7554',
        lake: '#2f7185',
        sun: '#d8943c',
        clay: '#b85f3e',
        trail: '#7b6651',
        paper: '#f7f1e4',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
