/**
 * Genera los íconos de la app instalable (public/icons/*.png) con el motor de
 * imágenes que trae Next.js. Se corre una vez: `node scripts/generate-icons.mjs`.
 * El dibujo es el birrete de lucide (GraduationCap) sobre el azul petróleo.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
// OG_PATH: copia corregida del generador (en Windows, la versión de Next 14 arma mal sus rutas internas).
const ogPath = process.env.OG_PATH ?? require.resolve("next/dist/compiled/@vercel/og/index.node.js");
const { ImageResponse } = await import(pathToFileURL(ogPath).href);
const React = require("react");

const PETROL = "#083B46";
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "public", "icons");
await mkdir(out, { recursive: true });

// Trazos de lucide GraduationCap (viewBox 24×24).
const CAP = [
  "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
  "M22 10v6",
  "M6 12.5V16a6 3 0 0 0 12 0v-3.5",
];

/** maskable: el dibujo ocupa el 60 % central (zona segura de Android). */
function icon(size, { maskable = false, radius = 0 } = {}) {
  const glyph = Math.round(size * (maskable ? 0.5 : 0.6));
  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PETROL,
          borderRadius: radius,
        },
      },
      React.createElement(
        "svg",
        {
          width: glyph,
          height: glyph,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "white",
          strokeWidth: 1.75,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        ...CAP.map((d) => React.createElement("path", { key: d, d })),
      ),
    ),
    { width: size, height: size },
  );
}

const targets = [
  ["icon-192.png", icon(192)],
  ["icon-512.png", icon(512)],
  ["maskable-512.png", icon(512, { maskable: true })],
  ["apple-touch-icon.png", icon(180)],
];
for (const [name, response] of targets) {
  await writeFile(join(out, name), Buffer.from(await response.arrayBuffer()));
  console.log("public/icons/" + name);
}
