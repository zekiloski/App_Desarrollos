import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/auth";
import { FormUsuario } from "./FormUsuario";

export const metadata: Metadata = { title: "Usuario" };

// /admin/usuarios/nuevo crea; /admin/usuarios/{id} edita.
export default async function PaginaUsuario({ params }: { params: Promise<{ id: string }> }) {
  await requerirPermiso("admin");
  const { id } = await params;

  let usuario = null;
  if (id !== "nuevo") {
    const n = Number(id);
    if (!Number.isInteger(n)) notFound();
    usuario = await db.usuario.findUnique({
      where: { id: n },
      select: { id: true, nombre: true, usuario: true, email: true, rol: true, telefono: true, activo: true },
    });
    if (!usuario) notFound();
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/admin/usuarios" className="inline-block text-sm font-semibold text-blue-700">
        ← Volver a usuarios
      </Link>
      <h1 className="text-2xl font-bold">{usuario ? "Editar usuario" : "Nuevo usuario"}</h1>
      <div className="tarjeta">
        <FormUsuario usuario={usuario} />
      </div>
    </div>
  );
}
