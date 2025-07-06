/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Modern brand colors with enhanced gradients
        brand: {
          25: "#FAFBFF",
          50: "#EEF4FF",
          100: "#DFE8FF",
          200: "#C0D1FF", 
          300: "#91B0FF",
          400: "#6290FF",
          500: "#3970FF",
          600: "#2154E6",
          700: "#173EC0",
          800: "#112B8D",
          900: "#0C1D61",
          950: "#071344"
        },
        // Enhanced accent colors for modern UI
        accent: {
          25: "#F8FFFE",
          50: "#F0FFFA", 
          100: "#CCFCEF",
          200: "#9DF7DB",
          300: "#69EFC8",
          400: "#39E3B4",
          500: "#16C79B",
          600: "#0E9C7A",
          700: "#0A775D",
          800: "#06543F",
          900: "#033628",
          950: "#012318"
        },
        // Sophisticated danger/error colors
        danger: {
          25: "#FFFBFA",
          50: "#FFF5F5",
          100: "#FFE3E3",
          200: "#FFC9C9",
          300: "#FFA8A8", 
          400: "#FF8787",
          500: "#FF6B6B",
          600: "#FA5252",
          700: "#F03E3E",
          800: "#E03131",
          900: "#C92A2A",
          950: "#9B1C1C"
        },
        // Modern success colors
        success: {
          25: "#F6FEF9",
          50: "#ECFDF3",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#022C22"
        },
        // Enhanced warning colors
        warning: {
          25: "#FFFCF5",
          50: "#FFF8E1",
          100: "#FFECB3",
          200: "#FFE082",
          300: "#FFD54F",
          400: "#FFCA28",
          500: "#FFC107",
          600: "#FFB300",
          700: "#FF8F00",
          800: "#FF6F00",
          900: "#E65100",
          950: "#BF360C"
        },
        // Modern sophisticated grays
        gray: {
          25: "#FEFEFE",
          50: "#FAFAFA",
          100: "#F8F9FA",
          200: "#E9ECEF",
          300: "#DEE2E6",
          400: "#CED4DA",
          500: "#ADB5BD",
          600: "#6C757D",
          700: "#495057",
          800: "#343A40",
          900: "#212529"
        },
        // Modern surface colors for glassmorphism
        surface: {
          light: "rgba(255, 255, 255, 0.85)",
          dark: "rgba(26, 29, 40, 0.85)",
          primary: "rgba(57, 112, 255, 0.15)",
          secondary: "rgba(22, 199, 155, 0.15)"
        },
        // Glassmorphism overlay colors
        overlay: {
          light: "rgba(255, 255, 255, 0.7)",
          dark: "rgba(0, 0, 0, 0.7)",
          blur: "rgba(255, 255, 255, 0.25)"
        }
      },
      // Enhanced shadow system for modern UI
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow': '0 0 20px rgba(57, 112, 255, 0.3)',
        'glow-accent': '0 0 20px rgba(22, 199, 155, 0.3)',
        'card': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'card-dark': '0 4px 16px rgba(0, 0, 0, 0.3)',
        'floating': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      },
      // Modern border radius scale
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem', 
        '3xl': '2rem',
        '4xl': '2.5rem'
      },
      // Enhanced backdrop blur
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px'
      },
      // Animation enhancements for smooth interactions
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 1s ease-in-out',
        'float': 'float 6s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-2%)' },
          '50%': { transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      // Enhanced typography with better font system
      fontFamily: {
        'display': ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'body': ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'h1': ['32px', '40px'],
        'h2': ['28px', '36px'],
        'h3': ['24px', '32px'],
        'h4': ['20px', '28px'],
        'h5': ['18px', '24px'],
        'h6': ['16px', '24px'],
        'body-lg': ['18px', '28px'],
        'body-md': ['16px', '24px'],
        'body-sm': ['14px', '20px'],
        'body-xs': ['12px', '16px'],
        'caption': ['12px', '16px'],
        'overline': ['10px', '16px'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
        '6xl': '64px',
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem'
      }
    },
  },
  plugins: [],
}