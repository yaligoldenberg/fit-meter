import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        coal: {
          950: "#08090a",
          900: "#0d0f0e",
          800: "#141715",
          700: "#1c211e",
          600: "#272e29",
          500: "#3a453e",
        },
        volt: {
          DEFAULT: "#d7ff3f",
          400: "#e2ff70",
          500: "#d7ff3f",
          600: "#b8e01c",
        },
        coral: {
          DEFAULT: "#ff5b3d",
          400: "#ff7b5f",
          500: "#ff5b3d",
          600: "#e6431f",
        },
        bone: "#f3f1e7",
      },
      fontFamily: {
        display: ["var(--font-anton)", "Impact", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
export default config;
