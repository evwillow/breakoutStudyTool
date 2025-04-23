import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/*.{js,ts,jsx,tsx}",
    "!./src/components/UserButton.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        primary: ["var(--font-geist-sans)"],
        secondary: ["var(--font-inter)"],
        mono: ["var(--font-geist-mono)"],
        data: ["var(--font-space-grotesk)"],
        minimal: ["var(--font-dm-sans)"],
        professional: ["var(--font-plus-jakarta)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        turquoise: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
