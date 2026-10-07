"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ItemNav = { href: string; texto: string; icono: "lista" | "tablero" | "mas" | "metricas" | "usuarios" };

const ICONOS: Record<ItemNav["icono"], string> = {
  metricas: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  tablero: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z",
  lista: "M4 6h16M4 12h16M4 18h16",
  mas: "M12 5v14M5 12h14",
  usuarios: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.75",
};

function activo(pathname: string, items: ItemNav[], href: string) {
  // Gana la coincidencia más larga, para que /solicitudes/nueva no marque también /solicitudes.
  const mejor = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return mejor?.href === href;
}

export function NavSuperior({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`rounded-lg px-3 py-2 text-sm font-semibold ${
            activo(pathname, items, i.href) ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {i.texto}
        </Link>
      ))}
    </nav>
  );
}

export function NavInferior({ items }: { items: ItemNav[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-superficie pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${
            activo(pathname, items, i.href) ? "text-blue-700" : "text-slate-500"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={ICONOS[i.icono]} />
          </svg>
          {i.texto}
        </Link>
      ))}
    </nav>
  );
}
