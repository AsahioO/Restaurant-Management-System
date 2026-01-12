/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8fc',
          100: '#fbf0f8',
          200: '#f8e4f2',
          300: '#f3d3ed',  // Color base solicitado
          400: '#e9b5dd',
          500: '#dc8fc9',
          600: '#c76eb2',
          700: '#a85596',
          800: '#8a4679',
          900: '#6f3a61',
          950: '#4a1f40',
        },
        accent: {
          50: '#fef7fb',
          100: '#fdeef8',
          200: '#fcddf1',
          300: '#f9c4e6',
          400: '#f4a1d5',
          500: '#eb7cc1',
          600: '#dc5aa8',
          700: '#c0408b',
          800: '#9f3672',
          900: '#83305e',
          950: '#511637',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
