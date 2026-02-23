/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hot Red color palette - Enhanced for fired clay brick appearance
        hotRed: {
          50: "#fff5f5",
          100: "#ffe3e3",
          200: "#ffc9c9",
          300: "#ffa8a8",
          400: "#ff8787",
          500: "#af4b0e", // Base hot red - more vibrant
          600: "#dc2f3b",
          700: "#c81d2e",
          800: "#b31a29",
          900: "#9a1622",
          950: "#7d0000",
        },
        // Burnt Clay color palette - Enhanced for fired clay brick appearance
        burntClay: {
          50: "#fdf5f3",
          100: "#f9e8e3",
          200: "#f4d4ca",
          300: "#eab8a8",
          400: "#e09880",
          500: "#c25a45", // Base burnt clay - deeper, more brick-like
          600: "#b34935",
          700: "#9a3a2a",
          800: "#872e21",
          900: "#6f2419",
          950: "#3b1e19",
        },
        // Additional theme colors
        primary: {
          DEFAULT: "#af4b0e",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#c25a45",
          foreground: "#ffffff",
        },
        background: "#ffffff",
        foreground: "#000000",
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        accent: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "#e2e8f0",
        input: "#e2e8f0",
        ring: "#af4b0e",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#0f172a",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#0f172a",
        },
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-highlight": {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": {
            opacity: 0.85,
            transform: "scale(1.05)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-highlight": "pulse-highlight 2s infinite",
      },
    },
  },
  plugins: [],
};
