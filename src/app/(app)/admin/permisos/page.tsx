import type { Metadata } from "next";
import Link from "next/link";
import { requerirPermiso } from "@/lib/auth";
import { cargarPermisos } from "@/lib/permisos-db";
import { FormPermisos } from "./FormPermisos";

export const metadata: Metadata = { title: "Permisos" };

export default async function PaginaPermisos() {
  await requerirPermiso("admin");
  const matriz = await cargarPermisos();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/admin/usuarios" className="inline-block text-sm font-semibold text-blue-700">
        ← Volver a Admin
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Permisos por rol</h1>
        <p className="text-sm text-slate-500">
          Marcá qué puede hacer cada rol. Lo que no está marcado no aparece en la app para esos usuarios y el
          servidor lo rechaza. Gerencia / Admin siempre tiene todo habilitado.
        </p>
      </div>
      <FormPermisos matriz={matriz} />
    </div>
  );
}
