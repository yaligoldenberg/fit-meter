import type { Config } from "tailwindcss";

/** Every colour is a CSS variable, so one `.dark` class reskins the whole app. */
const c = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: c("canvas"),
        paper: c("paper"),
        ink: {
          DEFAULT: c("ink"),
          800: c("ink-800"),
          700: c("ink-700"),
          600: c("ink-600"),
        },
        chalk: {
          DEFAULT: c("chalk"),
          50: c("chalk-50"),
          200: c("chalk-200"),
          300: c("chalk-300"),
        },
        rule: {
          DEFAULT: c("rule"),
          dark: c("rule-dark"),
        },
        slate: {
          DEFAULT: c("slate"),
          light: c("slate-light"),
        },
        signal: {
          DEFAULT: c("signal"),
          700: c("signal-700"),
          400: c("signal-400"),
          50: c("signal-50"),
        },
        flag: {
          red: c("flag-red"),
          amber: c("flag-amber"),
        },
      },
      fontFamily: {
        sans: ["var(--font-rubik)", "system-ui", "sans-serif"],
        display: ["var(--font-rubik)", "system-ui", "sans-serif"],
        body: ["var(--font-rubik)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sheet: "6px",
      },
      boxShadow: {
        sheet: "none",
        lift: "0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.10)",
      },
    },
  },
  plugins: [],
};
export default config;
