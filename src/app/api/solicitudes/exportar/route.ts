import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { condicionesDeFiltros, leerFiltros } from "@/lib/filtros";
import { diasAlerta } from "@/lib/config";
import { TIPOS_INGRESO, URGENCIAS, nombreEstado } from "@/lib/etiquetas";
import { generarExcelListado } from "@/lib/exportacion";

const MAX_FILAS = 5000;
const MATRIZ = { SIN_EVALUAR: "Sin evaluar", SI: "Sí", NO: "No" } as const;

const COLUMNAS = [
  "N° solicitud",
  "Fecha de ingreso",
  "Cliente",
  "Localidad",
  "Vendedor",
  "Estado",
  "En espera",
  "Urgencia",
  "Tipo de ingreso",
  "Descripción",
  "Implemento",
  "Cantidad estimada",
  "Material",
  "Espesor",
  "Dimensiones",
  "Requiere matriz",
  "Procesos",
  "Código de pieza",
  "Resolución",
  "Motivo de rechazo",
  "Ubicación",
  "Último movimiento",
  "Días sin movimiento",
];

// Excel aplica su propia zona horaria: se le pasa la hora de Argentina como si fuera UTC para que muestre esa hora.
const horaLocal = (d: Date) => new Date(d.getTime() - 3 * 3_600_000);

// Exporta el listado con los mismos filtros de la pantalla. Cada usuario exporta solo lo que puede ver.
export async function GET(req: Request) {
  const u = await usuarioActual();
  if (!u) return new NextResponse("No autenticado", { status: 401 });

  const filtros = leerFiltros(Object.fromEntries(new URL(req.url).searchParams));
  const solicitudes = await db.solicitud.findMany({
    where: { AND: [filtroVisibilidad(u), ...condicionesDeFiltros(filtros, await diasAlerta())] },
    orderBy: { fechaIngreso: "desc" },
    take: MAX_FILAS,
    include: {
      cliente: { select: { nombre: true, localidad: true } },
      vendedor: { select: { nombre: true } },
      procesos: { orderBy: { orden: "asc" }, select: { proceso: { select: { nombre: true } } } },
    },
  });

  const ahora = Date.now();
  const filas = solicitudes.map((s) => [
    s.numero,
    horaLocal(s.fechaIngreso),
    s.cliente.nombre,
    s.cliente.localidad,
    s.vendedor.nombre,
    nombreEstado(s.estado),
    s.enEspera ? "Sí" : "No",
    URGENCIAS[s.urgencia],
    TIPOS_INGRESO[s.tipoIngreso],
    s.descripcion,
    s.implemento,
    s.cantidadEstimada,
    s.material,
    s.espesor,
    s.dimensiones,
    MATRIZ[s.requiereMatriz],
    s.procesos.map((p) => p.proceso.nombre).join(" > "),
    s.codigoPieza,
    s.aprobada === null ? "" : s.aprobada ? "Aprobada" : "Rechazada",
    s.motivoRechazo,
    [s.sector, s.estante].filter(Boolean).join(" · "),
    horaLocal(s.fechaUltimoMovimiento),
    s.estado === "CERRADA" ? null : Math.floor((ahora - s.fechaUltimoMovimiento.getTime()) / 86_400_000),
  ]);

  const cuerpo = await generarExcelListado(COLUMNAS, filas);
  const hoy = new Date(ahora - 3 * 3_600_000).toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(cuerpo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="solicitudes_${hoy}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
