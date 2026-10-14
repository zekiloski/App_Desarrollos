"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type IconoNav =
  | "lista"
  | "tablero"
  | "mas"
  | "metricas"
  | "reportes"
  | "usuarios"
  | "permisos"
  | "procesos"
  | "avisos";

export type ItemNav = { href: string; texto: string; icono: IconoNav; grupo?: "admin" };

// Trazos de 24×24 (estilo línea). Un ícono puede tener varios trazos.
const ICONOS: Record<IconoNav | "menu" | "cerrar", string[]> = {
  lista: [
    "M9 4h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
    "M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2",
    "M8 12h8M8 16h5",
  ],
  tablero: ["M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z"],
  mas: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 8v8M8 12h8"],
  metricas: ["M4 20V10M10 20V4M16 20v-7M22 20H2"],
  reportes: [
    "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z",
    "M14 3v5h5",
    "M9 13h6M9 17h6M9 9h2",
  ],
  usuarios: [
    "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.75",
  ],
  permisos: ["M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z", "M9 12l2 2 4-4"],
  procesos: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  ],
  avisos: ["M4 6h16v12H4z", "M4 7l8 6 8-6"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  cerrar: ["M6 6l12 12M18 6L6 18"],
};

export function Icono({ nombre, className = "h-5 w-5" }: { nombre: keyof typeof ICONOS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONOS[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function activo(pathname: string, items: ItemNav[], href: string) {
  // Gana la coincidencia más larga, para que /solicitudes/nueva no marque también /solicitudes.
  const mejor = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return mejor?.href === href;
}

function Enlaces({ items, pathname }: { items: ItemNav[]; pathname: string }) {
  const principales = items.filter((i) => !i.grupo);
  const admin = items.filter((i) => i.grupo === "admin");

  const enlace = (i: ItemNav) => {
    const actual = activo(pathname, items, i.href);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          aria-current={actual ? "page" : undefined}
          className={`menu-enlace ${actual ? "menu-enlace-activo" : ""}`}
        >
          <span className="menu-icono">
            <Icono nombre={i.icono} />
          </span>
          {i.texto}
        </Link>
      </li>
    );
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="menu-grupo">Principal</div>
      <ul className="space-y-1">{principales.map(enlace)}</ul>
      {admin.length > 0 && (
        <>
          <div className="menu-grupo mt-6">Administración</div>
          <ul className="space-y-1">{admin.map(enlace)}</ul>
        </>
      )}
    </nav>
  );
}

// Menú lateral: fijo en pantallas grandes; en celular y tablet se abre desde la izquierda.
// `pie` es el bloque del usuario (nombre, tema, salir), armado en el servidor.
export function MenuLateral({ items, pie }: { items: ItemNav[]; pie: React.ReactNode }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  // Al navegar se cierra solo.
  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alTeclear);
    // Evita que el contenido de atrás se desplace mientras el menú está abierto.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [abierto]);

  const marca = (
    <Link href="/solicitudes" className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Oncativo S.A." width={300} height={82} className="h-9 w-auto rounded-md bg-white p-0.5 ring-1 ring-black/5" />
    </Link>
  );

  return (
    <>
      {/* Barra superior: solo en celular y tablet. */}
      <header className="barra-movil sticky top-0 z-30 flex h-14 items-center gap-3 px-3 lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={abierto}
          aria-controls="menu-lateral"
          className="menu-boton flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg"
        >
          <Icono nombre="menu" className="h-6 w-6" />
        </button>
        {marca}
        <span className="menu-texto-fuerte truncate text-sm font-semibold">Nuevos Desarrollos</span>
      </header>

      {/* Fondo oscurecido detrás del menú abierto. */}
      <div
        onClick={() => setAbierto(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden print:hidden ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        id="menu-lateral"
        className={`menu-lateral fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-out lg:translate-x-0 print:hidden ${
          abierto ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="menu-borde flex items-center justify-between gap-2 border-b px-5 py-4">
          <div>
            {marca}
            <div className="menu-tenue mt-2 text-xs font-semibold tracking-wider uppercase">Nuevos Desarrollos</div>
          </div>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="menu-boton flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg lg:hidden"
          >
            <Icono nombre="cerrar" className="h-6 w-6" />
          </button>
        </div>
        <Enlaces items={items} pathname={pathname} />
        <div className="menu-borde border-t p-4">{pie}</div>
      </aside>
    </>
  );
}
