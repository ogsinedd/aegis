/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "#2c2c2c",
        background: "#000000",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#2ecc71",
          hover: "#27ae60",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#2c2c2c",
          foreground: "#a1a1aa",
        },
        card: {
          DEFAULT: "#0d0d0d",
          foreground: "#ffffff",
        },
        accent: "#2ecc71",
        muted: {
          DEFAULT: "#27272a",
          foreground: "#a1a1aa",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "#22c55e",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 
