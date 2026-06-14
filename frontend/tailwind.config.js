/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        bg: "#05070f",
        indigo: { DEFAULT: "#6366f1", 500: "#6366f1" },
        emerald: { DEFAULT: "#10b981", 500: "#10b981" },
        amber: { DEFAULT: "#f59e0b", 500: "#f59e0b" },
        rose: { DEFAULT: "#f43f5e", 500: "#f43f5e" },
      },
    },
  },
  plugins: [],
};
