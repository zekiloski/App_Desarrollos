import type { Estado, Prisma, TipoIngreso } from "@prisma/client";
import { db } from "./db";
import type { UsuarioSesion } from "./auth";
import { filtroVisibilidad } from "./solicitudes";

// Reporte de nuevos desarrollos: una fila por solicitud con fechas, código, cómo ingresó, cómo se cargó
// al sistema productivo y quién fue responsable de cada etapa. Lo comparten la pantalla y el Excel.

export type Situacion = "todas" | "en_curso" | "en_produccion" | "rechazadas";

export type FiltrosReporte = { desde: string; hasta: string; situacion: Situacion };

const SITUACIONES: Situacion[] = ["todas", "en_curso", "en_produccion", "rechazadas"];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function leerFiltrosReporte(sp: Record<string, string | string[] | undefined>): FiltrosReporte {
  const txt = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const situacion = txt("situacion") as Situacion;
  return {
    desde: FECHA.test(txt("desde")) ? txt("desde") : "",
    hasta: FECHA.test(txt("hasta")) ? txt("hasta") : "",
    situacion: SITUACIONES.includes(situacion) ? situacion : "todas",
  };
}

export function filtrosReporteAQuery(f: FiltrosReporte) {
  const q = new URLSearchParams();
  if (f.desde) q.set("desde", f.desde);
  if (f.hasta) q.set("hasta", f.hasta);
  if (f.situacion !== "todas") q.set("situacion", f.situacion);
  return q.toString();
}

// Las fechas del formulario son días de Argentina (UTC-3).
const inicioDia = (d: string) => new Date(`${d}T00:00:00-03:00`);
const finDia = (d: string) => new Date(inicioDia(d).getTime() + 86_400_000);

function condiciones(f: FiltrosReporte): Prisma.SolicitudWhereInput[] {
  const c: Prisma.SolicitudWhereInput[] = [];
  if (f.desde) c.push({ fechaIngreso: { gte: inicioDia(f.desde) } });
  if (f.hasta) c.push({ fechaIngreso: { lt: finDia(f.hasta) } });
  if (f.situacion === "en_produccion") c.push({ cargadaEnProduccionEl: { not: null } });
  if (f.situacion === "rechazadas") c.push({ aprobada: false });
  if (f.situacion === "en_curso") c.push({ estado: { not: "CERRADA" }, cargadaEnProduccionEl: null, aprobada: { not: false } });
  return c;
}

// Etapas con responsable propio en el reporte (las del código y la producción salen de sus campos).
export const ETAPAS_REPORTE: { estado: Estado; nombre: string }[] = [
  { estado: "RECIBIDA_EN_PLANTA", nombre: "Recibida" },
  { estado: "EN_ANALISIS", nombre: "Análisis" },
  { estado: "MEDICIONES_PLANO", nombre: "Planimetría" },
  { estado: "DEFINICION_PROCESOS", nombre: "Procesos" },
  { estado: "EVALUACION_MATRIZ", nombre: "Matriz" },
  { estado: "APROBADA", nombre: "Aprobada" },
  { estado: "RECHAZADA", nombre: "Rechazada" },
  { estado: "CERRADA", nombre: "Cerrada" },
];

export type PasoReporte = { nombre: string; usuario: string; fecha: Date };

export type FilaReporte = {
  id: number;
  numero: string;
  cliente: string;
  descripcion: string;
  vendedor: string;
  tipoIngreso: TipoIngreso;
  fechaIngreso: Date;
  ingresadaPor: string;
  estado: Estado;
  codigo: string | null;
  codigoPor: string | null;
  codigoEl: Date | null;
  produccionPor: string | null;
  produccionEl: Date | null;
  // Desde el ingreso hasta la carga en el sistema productivo; si todavía no se cargó, hasta ahora.
  demoraMs: number;
  terminada: boolean;
  pasos: PasoReporte[];
};

export const MAX_FILAS_REPORTE = 2000;

export async function generarReporte(u: UsuarioSesion, f: FiltrosReporte): Promise<FilaReporte[]> {
  const solicitudes = await db.solicitud.findMany({
    where: { AND: [filtroVisibilidad(u), ...condiciones(f)] },
    orderBy: { fechaIngreso: "desc" },
    take: MAX_FILAS_REPORTE,
    include: {
      cliente: { select: { nombre: true } },
      vendedor: { select: { nombre: true } },
      creadaPor: { select: { nombre: true } },
      codigoCargadoPor: { select: { nombre: true } },
      cargadaEnProduccionPor: { select: { nombre: true } },
      movimientosEstado: {
        where: { enEspera: false },
        orderBy: { id: "asc" },
        select: { estadoAnterior: true, estadoNuevo: true, fecha: true, usuario: { select: { nombre: true } } },
      },
    },
  });

  const ahora = Date.now();
  return solicitudes.map((s) => {
    // Responsable de cada etapa: quien la hizo avanzar a esa etapa por última vez.
    const pasos: PasoReporte[] = [];
    for (const etapa of ETAPAS_REPORTE) {
      const m = s.movimientosEstado.findLast((x) => x.estadoNuevo === etapa.estado && x.estadoAnterior !== etapa.estado);
      if (m) pasos.push({ nombre: etapa.nombre, usuario: m.usuario.nombre, fecha: m.fecha });
    }
    const fin = s.cargadaEnProduccionEl ?? (s.estado === "CERRADA" ? s.fechaUltimoMovimiento : null);
    return {
      id: s.id,
      numero: s.numero,
      cliente: s.cliente.nombre,
      descripcion: s.descripcion,
      vendedor: s.vendedor.nombre,
      tipoIngreso: s.tipoIngreso,
      fechaIngreso: s.fechaIngreso,
      ingresadaPor: s.creadaPor.nombre,
      estado: s.estado,
      codigo: s.codigoPieza,
      codigoPor: s.codigoCargadoPor?.nombre ?? null,
      codigoEl: s.codigoCargadoEl,
      produccionPor: s.cargadaEnProduccionPor?.nombre ?? null,
      produccionEl: s.cargadaEnProduccionEl,
      demoraMs: (fin?.getTime() ?? ahora) - s.fechaIngreso.getTime(),
      terminada: !!fin,
      pasos,
    };
  });
}
