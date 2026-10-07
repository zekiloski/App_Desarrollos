"use client";

import { useEffect, useState } from "react";

type Tema = "auto" | "claro" | "oscuro";

const CLAVE = "nd_tema";
const SIGUIENTE: Record<Tema, Tema> = { auto: "claro", claro: "oscuro", oscuro: "auto" };
const NOMBRE: Record<Tema, string> = { auto: "Automático", claro: "Claro", oscuro: "Oscuro" };
const ICONO: Record<Tema, string> = {
  auto: "M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18",
  claro:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  oscuro: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
};

function leer(): Tema {
  try {
    const t = localStorage.getItem(CLAVE);
    return t === "claro" || t === "oscuro" ? t : "auto";
  } catch {
    return "auto";
  }
}

// Misma lógica que el script de app/layout.tsx, que aplica el tema antes del primer pintado.
function aplicar(t: Tema) {
  const oscuro = t === "oscuro" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", oscuro);
}

// Botón que alterna Automático (sigue al dispositivo) → Claro → Oscuro. Se recuerda en cada dispositivo.
export function SelectorTema({ conTexto = false }: { conTexto?: boolean }) {
  const [tema, setTema] = useState<Tema>("auto");

  useEffect(() => {
    setTema(leer());
    // En automático, acompaña el cambio de tema del sistema sin recargar.
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const alCambiar = () => aplicar(leer());
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  function alternar() {
    const nuevo = SIGUIENTE[tema];
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {
      // Sin almacenamiento (modo privado): el cambio vale hasta recargar.
    }
    setTema(nuevo);
    aplicar(nuevo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      title={`Tema: ${NOMBRE[tema]} (tocar para cambiar)`}
      aria-label={`Tema: ${NOMBRE[tema]}. Tocar para cambiar.`}
      className="flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={ICONO[tema]} fill={tema === "auto" ? "currentColor" : "none"} fillRule="evenodd" />
      </svg>
      {conTexto && <span>Tema: {NOMBRE[tema]}</span>}
    </button>
  );
}
