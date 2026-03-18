/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0a0a0a",
          raised: "#111111",
          overlay: "#1a1a1a",
          border: "#262626",
          hover: "#1f1f1f",
        },
        text: {
          primary: "#e5e5e5",
          secondary: "#a3a3a3",
          muted: "#636363",
        },
        accent: {
          DEFAULT: "#ffffff",
          dim: "#d4d4d4",
        },
        warning: {
          DEFAULT: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.1)",
          border: "rgba(245, 158, 11, 0.3)",
        },
        danger: {
          DEFAULT: "#ef4444",
          bg: "rgba(239, 68, 68, 0.1)",
          border: "rgba(239, 68, 68, 0.3)",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "pixel-xs": ["8px", { lineHeight: "16px" }],
        "pixel-sm": ["10px", { lineHeight: "20px" }],
        "pixel-base": ["12px", { lineHeight: "24px" }],
        "pixel-lg": ["14px", { lineHeight: "28px" }],
      },
    },
  },
  plugins: [],
};
