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
        // Primary (Brand Green)
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          active: "var(--color-primary-active)",
          bg: "var(--color-primary-bg)",
        },
        // Sidebar
        sidebar: {
          DEFAULT: "var(--color-sidebar)",
          hover: "var(--color-sidebar-hover)",
          active: "var(--color-sidebar-active)",
          header: "var(--color-sidebar-header)",
        },
        // Neutrals
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        // Text
        text: {
          heading: "var(--color-text-heading)",
          body: "var(--color-text-body)",
          muted: "var(--color-text-muted)",
        },
        // Semantic
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        brand: ["var(--font-brand)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
