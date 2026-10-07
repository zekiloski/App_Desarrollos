import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { generarCsv, generarExcel, type PiezaExportable } from "@/lib/exportacion";

const MATRIZ = { SIN_EVALUAR: "Sin evaluar", SI: "Si", NO: "No" } as const;

// Exportación de una pieza para cargarla en el sistema de producción. Queda registrado quién y cuándo exportó.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u) return new NextResponse("No autenticado", { status: 401 });
  if (!puede(u.rol, "codigo.gestionar")) return new NextResponse("Sin permiso", { status: 403 });

  const id = Number((await params).id);
  const s = Number.isInteger(id)
    ? await db.solicitud.findFirst({
        where: { AND: [{ id }, filtroVisibilidad(u)] },
        include: {
          cliente: { select: { nombre: true } },
          procesos: { orderBy: { orden: "asc" }, include: { proceso: { select: { nombre: true } } } },
        },
      })
    : null;
  if (!s) return new NextResponse("No encontrado", { status: 404 });
  if (!s.codigoPieza) return new NextResponse("La solicitud todavía no tiene código de pieza", { status: 400 });

  const pieza: PiezaExportable = {
    numero: s.numero,
    codigo: s.codigoPieza,
    descripcion: s.descripcion,
    material: s.material ?? "",
    espesor: s.espesor ?? "",
    dimensiones: s.dimensiones ?? "",
    cantidad: s.cantidadEstimada,
    cliente: s.cliente.nombre,
    requiereMatriz: MATRIZ[s.requiereMatriz],
    procesos: s.procesos.map((p) => ({ orden: p.orden, nombre: p.proceso.nombre, observaciones: p.observaciones ?? "" })),
  };

  const formato = new URL(req.url).searchParams.get("formato") === "csv" ? "csv" : "xlsx";
  const cuerpo = formato === "csv" ? Buffer.from(generarCsv([pieza]), "utf8") : await generarExcel([pieza]);
  const nombre = `${s.codigoPieza.replace(/[^A-Za-z0-9._-]+/g, "_")}_${s.numero}.${formato}`;

  await db.exportacionProduccion.create({ data: { solicitudId: s.id, usuarioId: u.id, formato } });

  return new NextResponse(new Uint8Array(cuerpo), {
    headers: {
      "Content-Type":
        formato === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
