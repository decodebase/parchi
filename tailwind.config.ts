import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:      "#0A0A0B",
        surface:         "#111113",
        surface2:        "#1A1A1E",
        border:          "#2A2A30",
        primary:         "#FF6A3D",
        "primary-muted": "rgba(255,106,61,0.15)",
        text:            "#FAFAFA",
        muted:           "#6B7280",
        subtle:          "#9CA3AF",
        success:         "#10B981",
        warning:         "#F59E0B",
        error:           "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card:    "0 1px 3px rgba(0,0,0,0.5)",
        "glow":  "0 0 20px rgba(255,106,61,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
