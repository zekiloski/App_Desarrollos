import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { FormNuevaSolicitud } from "./FormNuevaSolicitud";

export const metadata: Metadata = { title: "Nueva solicitud" };

export default async function PaginaNuevaSolicitud() {
  const u = await requerirPermiso("solicitud.crear");

  const [clientes, vendedores] = await Promise.all([
    db.cliente.findMany({
      orderBy: { nombre: "asc" },
      select: { nombre: true, contacto: true, telefono: true, localidad: true },
    }),
    u.rol === "VENDEDOR"
      ? []
      : db.usuario.findMany({
          where: { rol: "VENDEDOR", activo: true },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true },
        }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Nueva solicitud</h1>
      <FormNuevaSolicitud
        clientes={clientes}
        vendedores={vendedores}
        esVendedor={u.rol === "VENDEDOR"}
        conMaterial={puede(u.rol, "material.editar") || puede(u.rol, "tecnico.editar")}
        yo={{ id: u.id, nombre: u.nombre }}
      />
    </div>
  );
}
