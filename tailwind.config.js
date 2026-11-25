/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F9FC',
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        }
      },
      borderRadius: {
        'node': '14px',
        'module': '18px',
      },
      boxShadow: {
        'node-hover': '0 8px 24px -4px rgba(99, 102, 241, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.05)',
        'node-selected': '0 0 0 2px #6366F1, 0 12px 28px -4px rgba(99, 102, 241, 0.25)',
      }
    },
  },
  plugins: [],
}
