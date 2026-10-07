// Genera src/app/tema-oscuro.css. Uso: node scripts/generar-tema-oscuro.mjs
//
// En vez de agregar variantes "dark:" en cada pantalla, el modo oscuro redefine la paleta:
// los tonos claros (fondos de chips y avisos) pasan a ser tintes oscuros y los tonos oscuros
// (textos) pasan a ser claros. Así cualquier combinación de colores ya usada queda cubierta.
import { writeFileSync } from "node:fs";

const TONOS = ["sky", "cyan", "indigo", "violet", "purple", "fuchsia", "emerald", "red", "teal", "green", "amber", "blue"];

// Fondos y bordes: el color puro mezclado con la superficie oscura. Textos: el tono 400 aclarado.
const FONDOS = { 50: 13, 100: 24, 200: 36, 300: 52 };
const TEXTOS = { 600: 88, 700: 72, 800: 55, 900: 38 };

const GRISES = {
  50: "#1c2738",
  100: "#0c121d",
  200: "#263247",
  300: "#3a4960",
  400: "#6b7a90",
  500: "#94a3b8",
  600: "#b4c0d0",
  700: "#cbd5e1",
  800: "#e2e8f0",
  900: "#f1f5f9",
};

const lineas = [
  "/* Archivo generado por scripts/generar-tema-oscuro.mjs: no editar a mano. */",
  ":root.dark {",
  "  color-scheme: dark;",
  "  --color-superficie: #151d2c;",
  "  --color-marca: #2563eb;",
  "  --color-marca-fuerte: #1d4ed8;",
  "",
  ...Object.entries(GRISES).map(([n, v]) => `  --color-slate-${n}: ${v};`),
];
for (const t of TONOS) {
  lineas.push("");
  for (const [n, p] of Object.entries(FONDOS)) {
    lineas.push(`  --color-${t}-${n}: color-mix(in oklab, var(--color-${t}-500) ${p}%, #151d2c);`);
  }
  for (const [n, p] of Object.entries(TEXTOS)) {
    lineas.push(`  --color-${t}-${n}: color-mix(in oklab, var(--color-${t}-400) ${p}%, white);`);
  }
}
lineas.push("}", "");

writeFileSync(new URL("../src/app/tema-oscuro.css", import.meta.url), lineas.join("\n"));
console.log("tema-oscuro.css generado");
