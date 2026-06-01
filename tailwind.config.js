/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Paleta de cores do GESPUB.AI — imutável
      colors: {
        brand: {
          50:  '#EDE9FE',
          100: '#DDD6FE',
          500: '#7C3AED',
          700: '#5B21B6',
        },
        surface: {
          bg:   '#F4F4F6',
          card: '#FFFFFF',
        },
        txt: {
          primary:   '#18181B',
          secondary: '#71717A',
        },
        border: '#E4E4E7',
        status: {
          success:   '#16A34A',
          successBg: '#DCFCE7',
          warning:   '#D97706',
          warningBg: '#FEF3C7',
          error:     '#DC2626',
          errorBg:   '#FEE2E2',
        },
        admin: {
          sidebar: '#1E1B4B',
        },
        facebook: '#1877F2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
      },
      borderRadius: {
        'input': '8px',
        'card': '12px',
        'modal': '16px',
      },
      spacing: {
        'sidebar': '220px',
        'topbar': '56px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
