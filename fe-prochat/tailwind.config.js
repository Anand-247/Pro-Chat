/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enables dark mode toggling via a 'dark' class on the html/body element
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f172a',
          card: 'rgba(30, 41, 59, 0.7)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
        'spin-slow': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
