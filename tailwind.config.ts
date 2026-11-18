// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        uach: {
          canvas: "#F4F7F7",   // Blanco perla satinado del comunicado
          surface: "#FFFFFF",  // Blanco puro del escudo y papel iluminado
          subtle: "#E8F0F0",   // Superficie secundaria para hovers y pills
          teal: "#117873",     // Teal luminoso superior izquierdo
          tealDark: "#0C5958", // Teal medio detrás del escudo UACH
          emerald: "#17684F",  // Verde interno del hexágono UACH
          petrol: "#083B46",   // Azul petróleo profundo del marco
          ink: "#264143",      // Tinta pizarra oscura ("A LA COMUNIDAD UACH")
          muted: "#526D6F",    // Tinta secundaria del cuerpo de texto
          soft: "#7A9496",     // Metadatos y placeholders
        },
      },
      boxShadow: {
        "uach-card": "0 1px 2px rgba(8, 59, 70, 0.04), 0 0 0 1px rgba(38, 65, 67, 0.08)",
        "uach-hover": "0 8px 24px -4px rgba(8, 59, 70, 0.08), 0 0 0 1px rgba(17, 120, 115, 0.22)",
        "uach-modal": "0 24px 48px -12px rgba(8, 59, 70, 0.22), 0 0 0 1px rgba(38, 65, 67, 0.12)",
      },
      transitionTimingFunction: {
        "emil-out": "cubic-bezier(0.22, 1, 0.36, 1)",
        "emil-vaul": "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        "view-enter": {
          "0%": { opacity: "0", transform: "translateY(5px) scale(0.995)", filter: "blur(2px)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0px)" },
        },
        "modal-spring": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "view-enter": "view-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "modal-spring": "modal-spring 260ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;