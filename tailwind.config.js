/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#F7F5F2',
        ivory: '#EDEAE5',
        stone: '#2C2C2C',
        obsidian: '#111010',
        ash: '#8A8780',
        gold: '#C9A84C',
        ember: '#D4622A',
        sage: '#6B8F71',
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", 'serif'],
        sans: ["'DM Sans'", 'sans-serif'],
        mono: ["'DM Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
};
