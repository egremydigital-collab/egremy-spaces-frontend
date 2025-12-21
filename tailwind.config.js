/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': '#0D0D0D',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#262626',
        
        // Text
        'text-primary': '#FFFFFF',
        'text-secondary': '#A3A3A3',
        
        // Accents
        'accent-primary': '#6366F1',    // Indigo (n8n)
        'accent-success': '#22C55E',    // Verde (aprobado)
        'accent-warning': '#F59E0B',    // Ámbar (pendiente)
        'accent-danger': '#EF4444',     // Rojo (bloqueado)
        
        // Status colors for tasks
        'status-discovery': '#3B82F6',  // Azul
        'status-design': '#A855F7',     // Púrpura
        'status-build': '#F59E0B',      // Ámbar
        'status-qa': '#22C55E',         // Verde
        'status-deploy': '#6366F1',     // Índigo
        'status-live': '#10B981',       // Esmeralda
        'status-optimization': '#6B7280', // Gris
        'status-blocked': '#EF4444',    // Rojo
        'status-approval': '#F59E0B',   // Ámbar
        'status-bug': '#EF4444',        // Rojo
        'status-hotfix': '#DC2626',     // Rojo oscuro
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'lg': '0.75rem',
        'xl': '1rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
