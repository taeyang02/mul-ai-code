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
          blue: '#1e5a6b',
          dark: '#0f3b4f',
          green: '#2c7a5e',
          light: '#f5f8fa',
        }
      }
    },
  },
  plugins: [],
}
