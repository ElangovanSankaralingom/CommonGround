/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wood: {
          dark: '#8B6F47',
          DEFAULT: '#C49A6C',
          light: '#D4A574',
          bg: '#F5E6D3',
        },
        chrome: '#2C3E50',
        gold: '#F4D03F',
        role: {
          administrator: '#C0392B',
          designer: '#2E86AB',
          citizen: '#27AE60',
          investor: '#E67E22',
          advocate: '#8E44AD',
        },
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(244, 208, 63, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(244, 208, 63, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
