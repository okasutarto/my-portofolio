/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#2dd4bf', // teal-400
          DEFAULT: '#14b8a6', // teal-500
          dark: '#0d9488', // teal-600
        },
        secondary: {
          light: '#22d3ee', // cyan-400
          DEFAULT: '#06b6d4', // cyan-500
          dark: '#0891b2', // cyan-600
        },
        dark: {
          light: '#334155', // slate-700
          DEFAULT: '#1e293b', // slate-800
          dark: '#0f172a', // slate-900
        },
        light: {
          light: '#f8fafc', // slate-50
          DEFAULT: '#f1f5f9', // slate-100
          dark: '#e2e8f0', // slate-200
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
      },
      transitionDuration: {
        '400': '400ms',
      }
    },
  },
  plugins: [],
}
