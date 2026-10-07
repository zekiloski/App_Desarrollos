import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/auth";
import { ROLES } from "@/lib/etiquetas";

export const metadata: Metadata = { title: "Usuarios" };

export default async function PaginaUsuarios() {
  await requerirPermiso("admin");
  const usuarios = await db.usuario.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Link href="/admin/usuarios/nuevo" className="btn btn-primario">
          + Nuevo
        </Link>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-blue-700">
        <Link href="/admin/permisos">Permisos por rol →</Link>
        <Link href="/admin/procesos">Lista de procesos →</Link>
        <Link href="/admin/avisos">Avisos por email →</Link>
      </div>
      <ul className="space-y-3">
        {usuarios.map((x) => (
          <li key={x.id}>
            <Link
              href={`/admin/usuarios/${x.id}`}
              className={`tarjeta flex items-center justify-between gap-3 transition hover:border-blue-300 ${
                x.activo ? "" : "opacity-60"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{x.nombre}</div>
                <div className="truncate text-sm text-slate-500">
                  {x.usuario} · {x.email}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="chip bg-slate-100 text-slate-700">{ROLES[x.rol]}</span>
                {!x.activo && <span className="chip bg-red-100 text-red-700">Inactivo</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
