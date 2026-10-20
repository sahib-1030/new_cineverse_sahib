import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        serif: [
          "Georgia",
          "Cambria",
          '"Times New Roman"',
          "Times",
          "serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        black: "#000000",
        white: "#ffffff",
        cv: {
          canvas: "#06080d",
          ink: "#06080d",
          shell: "#0b0f16",
          surface: "#101620",
          "surface-2": "#121924",
          sidebar: "#0d121b",
          raised: "#192231",
          border: "#2a3547",
          "border-subtle": "rgba(84, 67, 59, 0.35)",
          text: "#f7f8fb",
          muted: "#9aa7b9",
          ember: "#ff6b57",
          coral: "#ff6b57",
          accent: "#ff6b57",
          cream: "#f7f8fb",
          moss: "#ff6b57", // Map legacy moss to ember to eliminate green
          vermilion: "#ff6b57",
          danger: "#ff5c75",
          violet: "#8b7cff",
          cyan: "#61d8ff",
          success: "#42d7a0",
        },
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
        },
        brand: {
          500: "#ffffff",
          600: "#e5e7eb",
        },
      },
      boxShadow: {
        modal: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "signal-pulse": "signalPulse 1.8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        signalPulse: {
          "0%, 100%": { opacity: "0.45", transform: "scaleX(0.94)" },
          "50%": { opacity: "1", transform: "scaleX(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
