/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--bg)",
          raised: "var(--bg-raised)",
          overlay: "var(--bg-overlay)",
          border: "var(--line)",
          hover: "var(--hover)",
        },
        text: {
          primary: "var(--ink)",
          secondary: "var(--ink-soft)",
          muted: "var(--ink-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          dim: "var(--accent-strong)",
        },
        warning: {
          DEFAULT: "var(--warn)",
          bg: "var(--warn-bg)",
          border: "var(--warn-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          bg: "var(--danger-bg)",
          border: "var(--danger-border)",
        },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ['"Newsreader"', "ui-serif", "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "var(--shadow)",
      },
      transitionTimingFunction: {
        smooth: "var(--ease)",
      },
    },
  },
  plugins: [],
};
