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
        // Custom brand colors from our theme
        brand: {
          50: "#EEF4FF",
          100: "#DFE8FF",
          200: "#C0D1FF",
          300: "#91B0FF",
          400: "#6290FF",
          500: "#3970FF",
          600: "#2154E6",
          700: "#173EC0",
          800: "#112B8D",
          900: "#0C1D61"
        },
        accent: {
          50: "#F0FFFA",
          100: "#CCFCEF",
          200: "#9DF7DB",
          300: "#69EFC8",
          400: "#39E3B4",
          500: "#16C79B",
          600: "#0E9C7A",
          700: "#0A775D",
          800: "#06543F",
          900: "#033628"
        },
        danger: {
          50: "#FFF5F5",
          100: "#FFE3E3",
          200: "#FFC9C9",
          300: "#FFA8A8",
          400: "#FF8787",
          500: "#FF6B6B",
          600: "#FA5252",
          700: "#F03E3E",
          800: "#E03131",
          900: "#C92A2A"
        },
        // Override gray with our custom grays
        gray: {
          50: "#FFFFFF",
          100: "#F8F9FA",
          200: "#E9ECEF",
          300: "#DEE2E6",
          400: "#CED4DA",
          500: "#ADB5BD",
          600: "#6C757D",
          700: "#495057",
          800: "#343A40",
          900: "#212529"
        }
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
      }
    },
  },
  plugins: [],
}