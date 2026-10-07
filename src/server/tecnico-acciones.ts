"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede, type Accion } from "@/lib/permisos";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { borrarArchivo } from "@/lib/archivos";
import type { ResultadoAccion } from "./estados-acciones";

const MAX_PROCESOS = 40;

const limpio = (v: FormDataEntryValue | string | null | undefined, max: number) => {
  const t = String(v ?? "").trim();
  return t ? t.slice(0, max) : null;
};

// Busca la solicitud verificando visibilidad y permiso. Una solicitud cerrada ya no se edita.
async function solicitudEditable(solicitudId: number, accion: Accion) {
  const u = await requerirUsuario();
  if (!puede(u.rol, accion)) return { u, s: null, error: "Tu rol no puede modificar estos datos." };
  const s = await db.solicitud.findFirst({
    where: { AND: [{ id: solicitudId }, filtroVisibilidad(u)] },
    select: { id: true, estado: true },
  });
  if (!s) return { u, s: null, error: "Solicitud no encontrada." };
  if (s.estado === "CERRADA") return { u, s: null, error: "La solicitud está cerrada: ya no se puede modificar." };
  return { u, s, error: "" };
}

// Acepta "1234.5", "1234,5" y "1.234,50".
function leerImporte(texto: string | null) {
  if (!texto) return null;
  let t = texto.replace(/[\s$]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n < 1e12 ? n : NaN;
}

export type EstadoTecnico = { error?: string; guardado?: number };

export async function guardarDatosTecnicos(
  solicitudId: number,
  _prev: EstadoTecnico,
  fd: FormData,
): Promise<EstadoTecnico> {
  const { s, error } = await solicitudEditable(solicitudId, "tecnico.editar");
  if (!s) return { error };

  const matriz = String(fd.get("requiereMatriz") ?? "");
  if (matriz !== "SIN_EVALUAR" && matriz !== "SI" && matriz !== "NO") return { error: "Indicá si requiere matriz." };

  const costo = leerImporte(limpio(fd.get("matrizCostoEstimado"), 30));
  if (Number.isNaN(costo)) return { error: "El costo de la matriz no es un número válido." };

  const diasTxt = limpio(fd.get("matrizTiempoEstimadoDias"), 10);
  const dias = diasTxt ? Number(diasTxt) : null;
  if (dias !== null && (!Number.isInteger(dias) || dias < 0 || dias > 3650)) {
    return { error: "El tiempo de la matriz tiene que ser una cantidad de días entera." };
  }

  const conMatriz = matriz === "SI";
  await db.solicitud.update({
    where: { id: s.id },
    data: {
      material: limpio(fd.get("material"), 150),
      espesor: limpio(fd.get("espesor"), 60),
      dimensiones: limpio(fd.get("dimensiones"), 250),
      requiereMatriz: matriz,
      matrizObservaciones: limpio(fd.get("matrizObservaciones"), 2000),
      // Costo y tiempo solo tienen sentido si hace falta la matriz.
      matrizCostoEstimado: conMatriz ? costo : null,
      matrizTiempoEstimadoDias: conMatriz ? dias : null,
    },
  });

  revalidatePath(`/solicitudes/${s.id}`);
  revalidatePath("/tablero");
  return { guardado: Date.now() };
}

// Reemplaza la lista completa: el orden del arreglo es el orden de fabricación.
export async function guardarProcesos(solicitudId: number, procesoIds: number[]): Promise<ResultadoAccion> {
  const { s, error } = await solicitudEditable(solicitudId, "tecnico.editar");
  if (!s) return { ok: false, error };

  if (!Array.isArray(procesoIds) || procesoIds.length > MAX_PROCESOS || procesoIds.some((i) => !Number.isInteger(i))) {
    return { ok: false, error: "La lista de procesos no es válida." };
  }
  const existentes = await db.proceso.findMany({ where: { id: { in: procesoIds } }, select: { id: true } });
  if (existentes.length !== new Set(procesoIds).size) {
    return { ok: false, error: "Alguno de los procesos ya no existe. Actualizá la página." };
  }

  await db.$transaction([
    db.solicitudProceso.deleteMany({ where: { solicitudId: s.id } }),
    db.solicitudProceso.createMany({
      data: procesoIds.map((procesoId, i) => ({ solicitudId: s.id, procesoId, orden: i + 1 })),
    }),
  ]);

  revalidatePath(`/solicitudes/${s.id}`);
  return { ok: true };
}

export async function eliminarAdjunto(adjuntoId: number): Promise<ResultadoAccion> {
  const a = await db.adjunto.findUnique({ where: { id: adjuntoId }, select: { id: true, ruta: true, solicitudId: true } });
  if (!a) return { ok: false, error: "El archivo ya no existe." };
  const { s, error } = await solicitudEditable(a.solicitudId, "tecnico.editar");
  if (!s) return { ok: false, error };

  await db.adjunto.delete({ where: { id: a.id } });
  await borrarArchivo(a.ruta);

  revalidatePath(`/solicitudes/${s.id}`);
  return { ok: true };
}

// Corrección del código ya cargado. La primera carga se hace al pasar a "Código creado".
export async function corregirCodigo(solicitudId: number, codigoNuevo: string): Promise<ResultadoAccion> {
  const { u, s, error } = await solicitudEditable(solicitudId, "codigo.gestionar");
  if (!s) return { ok: false, error };
  if (s.estado !== "CODIGO_CREADO") {
    return { ok: false, error: "El código solo se puede corregir mientras la solicitud está en “Código creado”." };
  }

  const codigo = limpio(codigoNuevo, 100);
  if (!codigo) return { ok: false, error: "Ingresá el código de pieza." };
  const repetido = await db.solicitud.findFirst({
    where: { codigoPieza: codigo, NOT: { id: s.id } },
    select: { numero: true },
  });
  if (repetido) return { ok: false, error: `Ese código ya está usado en la solicitud ${repetido.numero}.` };

  try {
    await db.solicitud.update({
      where: { id: s.id },
      data: { codigoPieza: codigo, codigoCargadoPorId: u.id, codigoCargadoEl: new Date() },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "Ese código de pieza ya está usado en otra solicitud." };
    }
    throw e;
  }

  revalidatePath(`/solicitudes/${s.id}`);
  return { ok: true };
}

// --- Catálogo de procesos ---

export async function guardarProcesoCatalogo(
  id: number | null,
  datos: { nombre: string; activo: boolean },
): Promise<ResultadoAccion> {
  const u = await requerirUsuario();
  if (!puede(u.rol, "procesos.catalogo")) return { ok: false, error: "Tu rol no puede editar la lista de procesos." };

  const nombre = limpio(datos.nombre, 100);
  if (!nombre || nombre.length < 2) return { ok: false, error: "Indicá el nombre del proceso." };

  const repetido = await db.proceso.findFirst({ where: { nombre, NOT: id ? { id } : undefined }, select: { id: true } });
  if (repetido) return { ok: false, error: "Ya existe un proceso con ese nombre." };

  if (id === null) {
    const ultimo = await db.proceso.aggregate({ _max: { orden: true } });
    await db.proceso.create({ data: { nombre, activo: true, orden: (ultimo._max.orden ?? 0) + 10 } });
  } else {
    await db.proceso.update({ where: { id }, data: { nombre, activo: !!datos.activo } });
  }

  revalidatePath("/admin/procesos");
  return { ok: true };
}
