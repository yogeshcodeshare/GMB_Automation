import type { Config } from "tailwindcss";

/**
 * Design tokens from design/handoff/design_handoff_gmb_sarathi/README.md
 * (DTCG names flattened to Tailwind keys). Do not invent new colors —
 * every screen in the handoff uses exactly these.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          app: "#F4F2ED",
          surface: "#FFFFFF",
          nav: "#14201C",
          public: "#FBF7EF",
        },
        ink: {
          DEFAULT: "#1B2321",
          soft: "#5A6560",
          faint: "#8A928D",
        },
        line: "rgba(27,35,33,0.10)",
        brand: {
          DEFAULT: "#0F5C48",
          hover: "#0B4B3A",
          accent: "#E39A2D",
          "accent-hover": "#D68F22",
        },
        band: {
          good: "#177B4B",
          "good-bg": "#E3F2E9",
          warn: "#9A5B00",
          "warn-strong": "#C77D00",
          "warn-bg": "#FAEEDC",
          crit: "#B3372B",
          "crit-bg": "#F9E5E2",
          none: "#8A928D",
        },
        nav: {
          text: "#C3CEC8",
          muted: "#71827A",
          "muted-2": "#8FA098",
          line: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-plex)",
          "var(--font-plex-devanagari)",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        chip: "999px",
        card: "12px",
        modal: "14px",
      },
      boxShadow: {
        modal: "0 12px 40px rgba(15,20,18,0.35)",
        pin: "0 1px 3px rgba(27,35,33,0.35)",
        toast: "0 8px 24px rgba(15,20,18,0.35)",
      },
      maxWidth: {
        content: "1180px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
