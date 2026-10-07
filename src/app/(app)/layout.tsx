import Link from "next/link";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { ROLES } from "@/lib/etiquetas";
import { cerrarSesion } from "@/server/auth-acciones";
import { SelectorTema } from "@/components/SelectorTema";
import { NavInferior, NavSuperior, type ItemNav } from "@/components/Navegacion";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario();

  const items: ItemNav[] = [
    { href: "/solicitudes", texto: "Solicitudes", icono: "lista" },
    { href: "/tablero", texto: "Tablero", icono: "tablero" },
  ];
  if (puede(u.rol, "solicitud.crear")) items.push({ href: "/solicitudes/nueva", texto: "Nueva", icono: "mas" });
  if (puede(u.rol, "admin")) {
    items.push({ href: "/metricas", texto: "Métricas", icono: "metricas" });
    items.push({ href: "/admin/usuarios", texto: "Admin", icono: "usuarios" });
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-0 print:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-superficie print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href="/solicitudes" className="flex items-center gap-2 font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Oncativo S.A." width={300} height={82} className="h-8 w-auto rounded bg-white" />
            <span className="hidden text-sm md:inline">Nuevos Desarrollos</span>
          </Link>
          <NavSuperior items={items} />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right leading-tight min-[430px]:block">
              <div className="text-sm font-semibold">{u.nombre}</div>
              <div className="text-xs text-slate-500">{ROLES[u.rol]}</div>
            </div>
            <SelectorTema />
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="min-h-10 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
      <NavInferior items={items} />
    </div>
  );
}
