/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0F2438',
          dark: '#071521',
          slate: '#1E293B',
          amber: '#B45309',
          'amber-hover': '#9A3412',
          'amber-tint': '#FEF3C7',
          cool: '#F1F5F9',
          grey: '#475569',
          steel: '#CBD5E1',
          // Backwards-compatible aliases mapped to the new palette:
          blue: '#0F2438',
          green: '#B45309',
          light: '#F1F5F9',
        }
      }
    },
  },
  plugins: [],
}
