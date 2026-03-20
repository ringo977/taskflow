/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        brand: {
          green:  '#1D9E75',
          blue:   '#378ADD',
          coral:  '#D85A30',
          purple: '#7F77DD',
          lime:   '#639922',
          amber:  '#EF9F27',
          gold:   '#BA7517',
          pink:   '#D4537E',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
