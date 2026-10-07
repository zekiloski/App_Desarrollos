import type { Estado } from "@prisma/client";
import { db } from "./db";
import { ESTADOS } from "./etiquetas";
import { promedio, tiemposDeSolicitud } from "./metricas-calculo";

export type Conteo = { nombre: string; cantidad: number };
export type TiempoEtapa = { estado: Estado; nombre: string; promedioMs: number; solicitudes: number };

const TOP = 8;

function contar(nombres: string[]): Conteo[] {
  const m = new Map<string, number>();
  for (const n of nombres) m.set(n, (m.get(n) ?? 0) + 1);
  return [...m.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
}

// Agrupa lo que queda fuera del top en "Otros" para que la suma siga dando el total.
function top(conteos: Conteo[]): Conteo[] {
  if (conteos.length <= TOP) return conteos;
  const resto = conteos.slice(TOP).reduce((a, c) => a + c.cantidad, 0);
  return [...conteos.slice(0, TOP), { nombre: `Otros (${conteos.length - TOP})`, cantidad: resto }];
}

// Métricas de las solicitudes ingresadas desde la fecha dada (null = todas).
export async function calcularMetricas(desde: Date | null) {
  const solicitudes = await db.solicitud.findMany({
    where: desde ? { fechaIngreso: { gte: desde } } : {},
    select: {
      estado: true,
      enEspera: true,
      aprobada: true,
      fechaIngreso: true,
      cargadaEnProduccionEl: true,
      vendedor: { select: { nombre: true } },
      cliente: { select: { nombre: true } },
      movimientosEstado: { orderBy: { id: "asc" }, select: { estadoNuevo: true, enEspera: true, fecha: true } },
    },
  });

  const hastaProduccion: number[] = [];
  const hastaResolucion: number[] = [];
  const esperas: number[] = [];
  const porEtapa = new Map<Estado, number[]>();

  for (const s of solicitudes) {
    if (s.cargadaEnProduccionEl) hastaProduccion.push(s.cargadaEnProduccionEl.getTime() - s.fechaIngreso.getTime());
    const resolucion = s.movimientosEstado.find((m) => m.estadoNuevo === "APROBADA" || m.estadoNuevo === "RECHAZADA");
    if (resolucion && s.aprobada !== null) hastaResolucion.push(resolucion.fecha.getTime() - s.fechaIngreso.getTime());

    const t = tiemposDeSolicitud(s.movimientosEstado);
    if (t.espera > 0) esperas.push(t.espera);
    for (const [estado, ms] of Object.entries(t.porEtapa) as [Estado, number][]) {
      porEtapa.set(estado, [...(porEtapa.get(estado) ?? []), ms]);
    }
  }

  // En el orden del flujo. "Cerrada" es el final: no tiene duración.
  const etapas: TiempoEtapa[] = ESTADOS.filter((e) => e.clave !== "CERRADA" && porEtapa.has(e.clave)).map((e) => ({
    estado: e.clave,
    nombre: e.nombre,
    promedioMs: promedio(porEtapa.get(e.clave)!)!,
    solicitudes: porEtapa.get(e.clave)!.length,
  }));

  return {
    total: solicitudes.length,
    abiertas: solicitudes.filter((s) => s.estado !== "CERRADA").length,
    enEspera: solicitudes.filter((s) => s.enEspera).length,
    aprobadas: solicitudes.filter((s) => s.aprobada === true).length,
    rechazadas: solicitudes.filter((s) => s.aprobada === false).length,
    hastaProduccion: { promedioMs: promedio(hastaProduccion), solicitudes: hastaProduccion.length },
    hastaResolucion: { promedioMs: promedio(hastaResolucion), solicitudes: hastaResolucion.length },
    espera: { promedioMs: promedio(esperas), solicitudes: esperas.length },
    etapas,
    porVendedor: top(contar(solicitudes.map((s) => s.vendedor.nombre))),
    porCliente: top(contar(solicitudes.map((s) => s.cliente.nombre))),
  };
}
