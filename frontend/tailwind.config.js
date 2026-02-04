/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB', // blue-600
        },
        secondary: {
          DEFAULT: '#374151', // gray-700
        },
        accent: {
          DEFAULT: '#10B981', // emerald-500
        },
        danger: {
          DEFAULT: '#EF4444', // red-500
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card-soft': '0 10px 25px -15px rgba(15,23,42,0.25)',
        'card-strong': '0 20px 45px -24px rgba(15,23,42,0.55)',
      },
      backgroundImage: {
        'gradient-primary':
          'radial-gradient(circle at top left, rgba(37,99,235,0.18), transparent 55%), radial-gradient(circle at bottom right, rgba(16,185,129,0.16), transparent 55%)',
      },
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  plugins: [],
};

