import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ledger: {
          ink: "#101418",
          panel: "#151a1f",
          line: "#2a3038",
          green: "#3fd18b",
          amber: "#f5b84b",
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
