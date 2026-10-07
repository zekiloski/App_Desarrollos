"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { ESTADOS, nombreEstado } from "@/lib/etiquetas";
import { avisarCambio } from "@/lib/notificaciones/avisos";
import { evaluarCambio, indiceEstado, puedePonerEnEspera } from "@/lib/estados";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const CAMBIO_CONCURRENTE = "CAMBIO_CONCURRENTE";
const MSG_CONCURRENTE = "Otra persona acaba de modificar esta solicitud. Actualizá la página y probá de nuevo.";

const limpio = (v: string | undefined, max: number) => {
  const t = (v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

function refrescar(solicitudId: number) {
  revalidatePath(`/solicitudes/${solicitudId}`);
  revalidatePath("/solicitudes");
  revalidatePath("/tablero");
}

async function buscar(solicitudId: number) {
  const u = await requerirUsuario();
  const s = await db.solicitud.findFirst({
    where: { AND: [{ id: solicitudId }, filtroVisibilidad(u)] },
    select: {
      id: true,
      estado: true,
      tipoIngreso: true,
      enEspera: true,
      aprobada: true,
      codigoPieza: true,
      requiereMatriz: true,
    },
  });
  return { u, s };
}

export async function cambiarEstado(
  solicitudId: number,
  datos: { destino: string; motivo?: string; sector?: string; estante?: string; codigoPieza?: string },
): Promise<ResultadoAccion> {
  const { u, s } = await buscar(solicitudId);
  if (!s) return { ok: false, error: "Solicitud no encontrada." };

  const destino = ESTADOS.find((e) => e.clave === datos.destino)?.clave;
  if (!destino) return { ok: false, error: "Etapa inválida." };

  const ev = evaluarCambio(s, u.rol, destino);
  if (!ev.ok) return ev;

  const motivo = limpio(datos.motivo, 500);
  const sector = limpio(datos.sector, 100);
  const estante = limpio(datos.estante, 100);
  const codigo = limpio(datos.codigoPieza, 100);

  if (ev.requisitos.includes("motivo") && !motivo) return { ok: false, error: "Indicá el motivo." };
  if (ev.requisitos.includes("ubicacion") && !sector) {
    return { ok: false, error: "Indicá en qué sector queda la pieza." };
  }
  if (ev.requisitos.includes("codigo")) {
    if (!codigo) return { ok: false, error: "Ingresá el código de pieza." };
    const repetido = await db.solicitud.findFirst({
      where: { codigoPieza: codigo, NOT: { id: s.id } },
      select: { numero: true },
    });
    if (repetido) return { ok: false, error: `Ese código ya está usado en la solicitud ${repetido.numero}.` };
  }

  const ahora = new Date();
  const data: Prisma.SolicitudUncheckedUpdateManyInput = { estado: destino, fechaUltimoMovimiento: ahora };

  if (ev.tipo === "avance") {
    if (destino === "RECIBIDA_EN_PLANTA") Object.assign(data, { sector, estante });
    if (destino === "APROBADA") Object.assign(data, { aprobada: true, motivoRechazo: null });
    if (destino === "RECHAZADA") Object.assign(data, { aprobada: false, motivoRechazo: motivo });
    if (destino === "CODIGO_CREADO" && codigo) {
      Object.assign(data, { codigoPieza: codigo, codigoCargadoPorId: u.id, codigoCargadoEl: ahora });
    }
    if (destino === "CARGADA_EN_PRODUCCION") {
      Object.assign(data, { cargadaEnProduccionPorId: u.id, cargadaEnProduccionEl: ahora });
    }
  } else {
    // Al volver atrás se deshace lo que ya no vale; el historial conserva lo que pasó.
    if (indiceEstado(destino) < indiceEstado("APROBADA")) Object.assign(data, { aprobada: null, motivoRechazo: null });
    if (indiceEstado(destino) < indiceEstado("CARGADA_EN_PRODUCCION")) {
      Object.assign(data, { cargadaEnProduccionPorId: null, cargadaEnProduccionEl: null });
    }
  }

  try {
    await db.$transaction(async (tx) => {
      // La condición sobre el estado actual evita pisar un cambio simultáneo de otro usuario.
      const r = await tx.solicitud.updateMany({
        where: { id: s.id, estado: s.estado, enEspera: false },
        data,
      });
      if (r.count === 0) throw new Error(CAMBIO_CONCURRENTE);
      await tx.movimientoEstado.create({
        data: {
          solicitudId: s.id,
          estadoAnterior: s.estado,
          estadoNuevo: destino,
          motivo,
          usuarioId: u.id,
          fecha: ahora,
        },
      });
      if (ev.tipo === "avance" && destino === "RECIBIDA_EN_PLANTA") {
        await tx.movimientoUbicacion.create({
          data: { solicitudId: s.id, sector, estante, usuarioId: u.id, fecha: ahora },
        });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === CAMBIO_CONCURRENTE) return { ok: false, error: MSG_CONCURRENTE };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ese código de pieza ya está usado en otra solicitud." };
    }
    console.error("Error al cambiar de estado", e);
    return { ok: false, error: "No se pudo guardar el cambio. Probá de nuevo." };
  }

  refrescar(s.id);
  await avisarCambio(
    s.id,
    u.id,
    ev.tipo === "retroceso" ? `volvió a "${nombreEstado(destino)}"` : `pasó a "${nombreEstado(destino)}"`,
    motivo,
  );
  return { ok: true };
}

// "En espera" es una marca sobre la etapa actual: al retomar, la solicitud sigue donde estaba.
export async function cambiarEspera(
  solicitudId: number,
  datos: { enEspera: boolean; motivo?: string },
): Promise<ResultadoAccion> {
  const { u, s } = await buscar(solicitudId);
  if (!s) return { ok: false, error: "Solicitud no encontrada." };
  if (!puedePonerEnEspera(s, u.rol)) return { ok: false, error: "No podés cambiar la espera de esta solicitud." };
  if (s.enEspera === datos.enEspera) return { ok: false, error: MSG_CONCURRENTE };

  const motivo = limpio(datos.motivo, 500);
  if (datos.enEspera && !motivo) return { ok: false, error: "Indicá por qué queda en espera." };

  const ahora = new Date();
  try {
    await db.$transaction(async (tx) => {
      const r = await tx.solicitud.updateMany({
        where: { id: s.id, estado: s.estado, enEspera: s.enEspera },
        data: {
          enEspera: datos.enEspera,
          motivoEspera: datos.enEspera ? motivo : null,
          fechaUltimoMovimiento: ahora,
        },
      });
      if (r.count === 0) throw new Error(CAMBIO_CONCURRENTE);
      await tx.movimientoEstado.create({
        data: {
          solicitudId: s.id,
          estadoAnterior: s.estado,
          estadoNuevo: s.estado,
          enEspera: datos.enEspera,
          motivo: datos.enEspera ? motivo : null,
          usuarioId: u.id,
          fecha: ahora,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === CAMBIO_CONCURRENTE) return { ok: false, error: MSG_CONCURRENTE };
    console.error("Error al cambiar la espera", e);
    return { ok: false, error: "No se pudo guardar el cambio. Probá de nuevo." };
  }

  refrescar(s.id);
  await avisarCambio(
    s.id,
    u.id,
    datos.enEspera ? "quedó en espera" : `se retomó en "${nombreEstado(s.estado)}"`,
    datos.enEspera ? motivo : null,
  );
  return { ok: true };
}

export type EstadoUbicacion = { error?: string; guardado?: number };

export async function registrarUbicacion(
  solicitudId: number,
  _prev: EstadoUbicacion,
  fd: FormData,
): Promise<EstadoUbicacion> {
  const { u, s } = await buscar(solicitudId);
  if (!s) return { error: "Solicitud no encontrada." };
  if (!puede(u.rol, "ubicacion.editar")) return { error: "Tu rol no puede registrar ubicaciones." };

  const sector = limpio(String(fd.get("sector") ?? ""), 100);
  const estante = limpio(String(fd.get("estante") ?? ""), 100);
  const tenidaPorTxt = String(fd.get("tenidaPorId") ?? "");
  let tenidaPorId: number | null = null;
  if (tenidaPorTxt) {
    const p = await db.usuario.findFirst({ where: { id: Number(tenidaPorTxt) || 0, activo: true }, select: { id: true } });
    if (!p) return { error: "La persona elegida no es válida." };
    tenidaPorId = p.id;
  }
  if (!sector && !estante && !tenidaPorId) return { error: "Indicá el sector, el estante o quién tiene la pieza." };

  await db.$transaction([
    db.solicitud.update({ where: { id: s.id }, data: { sector, estante, tenidaPorId } }),
    db.movimientoUbicacion.create({ data: { solicitudId: s.id, sector, estante, tenidaPorId, usuarioId: u.id } }),
  ]);

  refrescar(s.id);
  return { guardado: Date.now() };
}
