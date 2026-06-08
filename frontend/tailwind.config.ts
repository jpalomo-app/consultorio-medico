import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          400: "#f87171",
          500: "#B91C1C",   // rojo corporativo SM
          600: "#991B1B",
          700: "#7f1d1d",
          800: "#6b1a1a",
          900: "#450a0a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-pattern": "radial-gradient(ellipse at 70% 50%, rgba(185,28,28,0.12) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
