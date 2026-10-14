import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { TIPOS_INGRESO, nombreEstado } from "@/lib/etiquetas";
import { generarExcelListado } from "@/lib/exportacion";
import { ETAPAS_REPORTE, generarReporte, leerFiltrosReporte } from "@/lib/reportes";

// Excel aplica su propia zona horaria: se le pasa la hora de Argentina como si fuera UTC para que muestre esa hora.
const horaLocal = (d: Date | null) => (d ? new Date(d.getTime() - 3 * 3_600_000) : null);
const dias = (ms: number) => Math.round((ms / 86_400_000) * 10) / 10;

// Mismo reporte que la pantalla /reportes, con una columna por dato para poder filtrar y ordenar en Excel.
export async function GET(req: Request) {
  const u = await usuarioActual();
  if (!u) return new NextResponse("No autenticado", { status: 401 });
  if (!puede(u.rol, "reportes.ver")) return new NextResponse("Sin permiso", { status: 403 });

  const f = leerFiltrosReporte(Object.fromEntries(new URL(req.url).searchParams));
  const filas = await generarReporte(u, f);

  const columnas = [
    "N° solicitud",
    "Cliente",
    "Descripción",
    "Fecha de ingreso",
    "Tipo de ingreso",
    "Cargada por",
    "Vendedor",
    "Estado",
    ...ETAPAS_REPORTE.flatMap((e) => [`${e.nombre}: responsable`, `${e.nombre}: fecha`]),
    "Código de pieza",
    "Código cargado por",
    "Código cargado el",
    "Cargada en sistema productivo por",
    "Cargada en sistema productivo el",
    "Días hasta sistema productivo / cierre",
    "Terminada",
  ];

  const datos = filas.map((x) => [
    x.numero,
    x.cliente,
    x.descripcion,
    horaLocal(x.fechaIngreso),
    TIPOS_INGRESO[x.tipoIngreso],
    x.ingresadaPor,
    x.vendedor,
    nombreEstado(x.estado),
    ...ETAPAS_REPORTE.flatMap((e) => {
      const p = x.pasos.find((y) => y.nombre === e.nombre);
      return [p?.usuario ?? null, horaLocal(p?.fecha ?? null)];
    }),
    x.codigo,
    x.codigoPor,
    horaLocal(x.codigoEl),
    x.produccionPor,
    horaLocal(x.produccionEl),
    dias(x.demoraMs),
    x.terminada ? "Sí" : "No (en curso)",
  ]);

  const cuerpo = await generarExcelListado(columnas, datos, "Reporte");
  const hoy = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(cuerpo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_nuevos_desarrollos_${hoy}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
