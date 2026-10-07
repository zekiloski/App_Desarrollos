import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nuevos Desarrollos", template: "%s · Nuevos Desarrollos" },
  description: "Seguimiento de piezas nuevas desde que ingresan hasta que se cargan en producción.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#151d2c" },
  ],
};

// Aplica el tema guardado antes del primer pintado, para que no parpadee en claro al cargar.
// Debe coincidir con la lógica de components/SelectorTema.tsx.
const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("nd_tema");var o=t==="oscuro"||(t!=="claro"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",o)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: el script agrega la clase "dark" antes de que React hidrate.
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      {/* Algunas extensiones del navegador agregan atributos al body antes de que React cargue. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
