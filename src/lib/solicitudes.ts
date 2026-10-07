import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { puede } from "./permisos";
import type { UsuarioSesion } from "./auth";

// El vendedor solo ve las solicitudes que trajo o que cargó él.
export function filtroVisibilidad(u: UsuarioSesion): Prisma.SolicitudWhereInput {
  if (puede(u.rol, "solicitud.verTodas")) return {};
  return { OR: [{ vendedorId: u.id }, { creadaPorId: u.id }] };
}

export async function puedeVerSolicitud(u: UsuarioSesion, solicitudId: number) {
  const n = await db.solicitud.count({
    where: { AND: [{ id: solicitudId }, filtroVisibilidad(u)] },
  });
  return n > 0;
}

export function formatearNumero(anio: number, correlativo: number) {
  return `ND-${anio}-${String(correlativo).padStart(4, "0")}`;
}

// Debe llamarse dentro de una transacción: el update bloquea la fila del año y evita duplicados.
export async function siguienteNumero(tx: Prisma.TransactionClient, anio: number) {
  const c = await tx.contador.upsert({
    where: { anio },
    create: { anio, ultimo: 1 },
    update: { ultimo: { increment: 1 } },
  });
  return { correlativo: c.ultimo, numero: formatearNumero(anio, c.ultimo) };
}
