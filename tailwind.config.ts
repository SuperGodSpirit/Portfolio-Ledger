import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ledger: {
          ink: "#101418",
          panel: "#151a1f",
          line: "#2a3038",
          green: "#3fd18b",
          red: "#ef4444",
          amber: "#f5b84b",
          blue: "#3b82f6",
          gray: "#8793a3",
          steel: "#dce2ea",
        },
      },
      boxShadow: {
        ledger: "0 24px 80px rgba(0, 0, 0, 0.32)",
      },
    },
  },
  plugins: [],
} satisfies Config;
