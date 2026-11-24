import type { MetadataRoute } from "next";

/** App instalable: se abre a pantalla completa desde el ícono del celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plataforma UACH",
    short_name: "UACH",
    description: "Plataforma institucional de la Universidad de los Altos de Chiapas",
    lang: "es-MX",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F7F7",
    theme_color: "#083B46",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
