/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#0d0d0d',
        secondary: '#1a1a1a',
        accent: '#00b4d8',
        star: '#d4af37',
        'space-black': '#0d0d0d',
        'space-gray': '#1a1a1a',
        'space-blue': '#00b4d8',
        'space-gold': '#d4af37',
        border: 'rgba(255, 255, 255, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
        '3xl': '64px',
      },
      animation: {
        fadeIn: 'fadeIn 1s ease-in-out',
        pulseSlow: 'pulse 3s ease-in-out infinite',
        twinkle: 'twinkle 2s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        starburst: 'starburst 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        twinkle: {
          '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.2)' },
        },
        glow: {
          '0%, 100%': { 
            boxShadow: '0 0 4px rgba(212, 175, 55, 0.6), 0 0 8px rgba(212, 175, 55, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 8px rgba(212, 175, 55, 0.8), 0 0 16px rgba(212, 175, 55, 0.5)' 
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        starburst: {
          '0%, 100%': { 
            opacity: 0.3,
            transform: 'scale(1) rotate(0deg)',
            filter: 'blur(1px)'
          },
          '50%': { 
            opacity: 0.8,
            transform: 'scale(1.1) rotate(180deg)',
            filter: 'blur(0px)'
          },
        },
      },
    },
  },
  plugins: [],
};