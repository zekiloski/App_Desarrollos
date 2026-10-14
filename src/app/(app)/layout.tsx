import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { cargarPermisos } from "@/lib/permisos-db";
import { ProveedorPermisos } from "@/components/ProveedorPermisos";
import { ROLES } from "@/lib/etiquetas";
import { cerrarSesion } from "@/server/auth-acciones";
import { SelectorTema } from "@/components/SelectorTema";
import { MenuLateral, type ItemNav } from "@/components/Navegacion";

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario();

  const matriz = await cargarPermisos();

  const items: ItemNav[] = [{ href: "/solicitudes", texto: "Solicitudes", icono: "lista" }];
  if (puede(u.rol, "solicitud.crear")) items.push({ href: "/solicitudes/nueva", texto: "Nueva solicitud", icono: "mas" });
  if (puede(u.rol, "tablero.ver")) items.push({ href: "/tablero", texto: "Tablero", icono: "tablero" });
  if (puede(u.rol, "metricas.ver")) items.push({ href: "/metricas", texto: "Métricas", icono: "metricas" });
  if (puede(u.rol, "reportes.ver")) items.push({ href: "/reportes", texto: "Reportes", icono: "reportes" });
  if (puede(u.rol, "admin")) {
    items.push(
      { href: "/admin/usuarios", texto: "Usuarios", icono: "usuarios", grupo: "admin" },
      { href: "/admin/permisos", texto: "Permisos por rol", icono: "permisos", grupo: "admin" },
      { href: "/admin/procesos", texto: "Lista de procesos", icono: "procesos", grupo: "admin" },
      { href: "/admin/avisos", texto: "Avisos por email", icono: "avisos", grupo: "admin" },
    );
  }

  const pie = (
    <>
      <div className="flex items-center gap-3">
        <div className="avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white">
          {iniciales(u.nombre)}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="menu-texto-fuerte truncate text-sm font-semibold">{u.nombre}</div>
          <div className="menu-tenue truncate text-xs">{ROLES[u.rol]}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <SelectorTema enMenu conTexto />
        <form action={cerrarSesion} className="ml-auto">
          <button
            type="submit"
            className="menu-boton min-h-10 cursor-pointer rounded-lg border px-3 text-sm font-semibold"
          >
            Salir
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh lg:pl-72 print:pl-0">
      <MenuLateral items={items} pie={pie} />
      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <ProveedorPermisos matriz={matriz}>{children}</ProveedorPermisos>
      </main>
    </div>
  );
}
