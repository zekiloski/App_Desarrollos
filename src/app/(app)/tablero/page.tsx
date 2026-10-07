import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/auth";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { Tablero, type Tarjeta } from "./Tablero";

export const metadata: Metadata = { title: "Tablero" };

// Las cerradas se acumulan para siempre: en el tablero solo se muestran las recientes.
const DIAS_CERRADAS = 30;

export default async function PaginaTablero() {
  const u = await requerirPermiso("tablero.ver");
  const desde = new Date(Date.now() - DIAS_CERRADAS * 86_400_000);

  const solicitudes = await db.solicitud.findMany({
    where: {
      AND: [
        filtroVisibilidad(u),
        { OR: [{ estado: { not: "CERRADA" } }, { fechaUltimoMovimiento: { gte: desde } }] },
      ],
    },
    orderBy: { fechaUltimoMovimiento: "asc" },
    select: {
      id: true,
      numero: true,
      descripcion: true,
      urgencia: true,
      estado: true,
      tipoIngreso: true,
      enEspera: true,
      aprobada: true,
      codigoPieza: true,
      requiereMatriz: true,
      etiquetaQr: true,
      sector: true,
      estante: true,
      fechaUltimoMovimiento: true,
      cliente: { select: { nombre: true } },
      creadaPor: { select: { nombre: true } },
      fotos: { select: { rutaMiniatura: true }, orderBy: { id: "asc" }, take: 1 },
    },
  });

  const ahora = Date.now();
  const tarjetas: Tarjeta[] = solicitudes.map((s) => ({
    id: s.id,
    numero: s.numero,
    cliente: s.cliente.nombre,
    cargadaPor: s.creadaPor.nombre,
    descripcion: s.descripcion,
    urgencia: s.urgencia,
    estado: s.estado,
    tipoIngreso: s.tipoIngreso,
    enEspera: s.enEspera,
    aprobada: s.aprobada,
    codigoPieza: s.codigoPieza,
    requiereMatriz: s.requiereMatriz,
    etiquetaQr: s.etiquetaQr,
    sector: s.sector,
    estante: s.estante,
    dias: Math.floor((ahora - s.fechaUltimoMovimiento.getTime()) / 86_400_000),
    miniatura: s.fotos[0] ? `/api/archivos/${s.fotos[0].rutaMiniatura}` : null,
  }));

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold">Tablero</h1>
        <p className="text-sm text-slate-500">
          Arrastrá una tarjeta a otra columna para cambiarla de etapa (en el celular, mantenela apretada un
          momento). Las cerradas se muestran durante {DIAS_CERRADAS} días.
        </p>
      </div>
      <Tablero tarjetas={tarjetas} rol={u.rol} />
    </div>
  );
}
