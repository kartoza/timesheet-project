module.exports = {
  content: [
    './src/components/pmo_dashboard/**/*.{js,jsx,ts,tsx}',
    './src/constants/**/*.{js,jsx,ts,tsx}',
    './src/PMODashboard.tsx',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        'slide-up-fade': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up-fade': 'slide-up-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};
