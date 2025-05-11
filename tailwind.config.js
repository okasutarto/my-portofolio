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
          light: '#6366f1', // indigo-500
          DEFAULT: '#4f46e5', // indigo-600
          dark: '#4338ca', // indigo-700
        },
        secondary: {
          light: '#f43f5e', // rose-500
          DEFAULT: '#e11d48', // rose-600
          dark: '#be123c', // rose-700
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
