import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/auth";
import { ListaProcesos } from "./ListaProcesos";

export const metadata: Metadata = { title: "Procesos" };

export default async function PaginaProcesos() {
  await requerirPermiso("procesos.catalogo");
  const procesos = await db.proceso.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: { id: true, nombre: true, activo: true, _count: { select: { solicitudes: true } } },
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Lista de procesos</h1>
        <p className="text-sm text-slate-500">
          Son las opciones que aparecen al definir los procesos de una pieza. Un proceso que ya no se usa se
          desactiva en vez de borrarse, para no perder el historial de las piezas que lo tienen.
        </p>
      </div>
      <ListaProcesos
        procesos={procesos.map((p) => ({ id: p.id, nombre: p.nombre, activo: p.activo, usos: p._count.solicitudes }))}
      />
    </div>
  );
}
