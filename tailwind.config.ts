import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#030303",
        card: "#0a0a0a",
        border: "#1a1a1a",
        dim: "#a1a1a1",
        muted: "#737373",
        primary: "#6366f1",
        "primary-dim": "#312e81",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
      },
    },
  },
  plugins: [],
}

export default config
