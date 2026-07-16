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
        nunito: ["var(--font-nunito)", "sans-serif"],
        pacifico: ["var(--font-pacifico)", "cursive"],
      },
      colors: {
        // Flavor palette — mirrors FLAVORS config in src/lib/flavors.ts
        vanilla: "#F5E6C8",
        chocolate: "#6B4226",
        strawberry: "#F4A6B0",
        mint: "#A8D8C0",
        cookies: "#EDEDED",
        bubblegum: "#F9B4E0",
      },
    },
  },
  plugins: [],
};
export default config;
