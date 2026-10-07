"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { puedeVerSolicitud, siguienteNumero } from "@/lib/solicitudes";
import { avisarNuevaSolicitud } from "@/lib/notificaciones/avisos";

export type ResultadoCrear =
  | { ok: true; id: number; numero: string }
  | { ok: false; error: string; campos?: Record<string, string> };

const opcional = (max: number) => z.string().trim().max(max).optional();

const esquemaSolicitud = z.object({
  clienteNombre: z.string().trim().min(2, "Indicá el cliente").max(150),
  clienteContacto: opcional(150),
  clienteTelefono: opcional(40),
  clienteLocalidad: opcional(120),
  vendedorId: z.coerce.number().int().positive().optional(),
  tipoIngreso: z.enum(["FOTOS", "FISICA", "AMBAS"], { message: "Elegí cómo ingresó la pieza" }),
  descripcion: z.string().trim().min(5, "Describí la pieza (mínimo 5 letras)").max(5000),
  cantidadEstimada: z.coerce.number().int("Tiene que ser un número entero").positive("Tiene que ser mayor a 0").max(10_000_000).optional(),
  urgencia: z.enum(["BAJA", "NORMAL", "ALTA", "URGENTE"]),
  implemento: opcional(200),
});

// Los campos vacíos del formulario llegan como "": se tratan como no informados.
function leer(fd: FormData) {
  const o: Record<string, string | undefined> = {};
  for (const k of Object.keys(esquemaSolicitud.shape)) {
    const v = fd.get(k);
    o[k] = typeof v === "string" && v.trim() !== "" ? v : undefined;
  }
  return o;
}

export async function crearSolicitud(fd: FormData): Promise<ResultadoCrear> {
  const u = await requerirUsuario();
  if (!puede(u.rol, "solicitud.crear")) return { ok: false, error: "Tu rol no puede cargar solicitudes." };

  const r = esquemaSolicitud.safeParse(leer(fd));
  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !campos[k]) campos[k] = i.message;
    }
    return { ok: false, error: "Revisá los campos marcados.", campos };
  }
  const d = r.data;

  // El vendedor siempre carga a su nombre; el resto elige a qué vendedor corresponde.
  let vendedorId = u.id;
  if (u.rol !== "VENDEDOR" && d.vendedorId && d.vendedorId !== u.id) {
    const v = await db.usuario.findFirst({ where: { id: d.vendedorId, rol: "VENDEDOR", activo: true } });
    if (!v) return { ok: false, error: "Revisá los campos marcados.", campos: { vendedorId: "Vendedor inválido" } };
    vendedorId = v.id;
  }

  const ahora = new Date();
  const anio = ahora.getFullYear();

  const crear = () =>
    db.$transaction(async (tx) => {
      const existente = await tx.cliente.findUnique({ where: { nombre: d.clienteNombre } });
      const cliente = existente
        ? await tx.cliente.update({
            where: { id: existente.id },
            // Solo completa lo que faltaba: no pisa datos ya cargados del cliente.
            data: {
              contacto: existente.contacto ?? d.clienteContacto,
              telefono: existente.telefono ?? d.clienteTelefono,
              localidad: existente.localidad ?? d.clienteLocalidad,
            },
          })
        : await tx.cliente.create({
            data: {
              nombre: d.clienteNombre,
              contacto: d.clienteContacto,
              telefono: d.clienteTelefono,
              localidad: d.clienteLocalidad,
            },
          });

      const { correlativo, numero } = await siguienteNumero(tx, anio);
      const s = await tx.solicitud.create({
        data: {
          numero,
          anio,
          correlativo,
          tokenQr: randomBytes(16).toString("base64url"),
          clienteId: cliente.id,
          vendedorId,
          creadaPorId: u.id,
          fechaIngreso: ahora,
          tipoIngreso: d.tipoIngreso,
          descripcion: d.descripcion,
          cantidadEstimada: d.cantidadEstimada,
          urgencia: d.urgencia,
          implemento: d.implemento,
          estado: "INGRESADA",
          fechaUltimoMovimiento: ahora,
          movimientosEstado: { create: { estadoNuevo: "INGRESADA", usuarioId: u.id, fecha: ahora } },
        },
      });
      return { id: s.id, numero: s.numero };
    });

  try {
    let creada;
    try {
      creada = await crear();
    } catch (e) {
      // Dos altas simultáneas pueden chocar al crear el mismo cliente o el contador del año: se reintenta una vez.
      if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2002" || e.code === "P2034")) {
        creada = await crear();
      } else throw e;
    }
    revalidatePath("/solicitudes");
    revalidatePath("/tablero");
    await avisarNuevaSolicitud(creada.id, u.id);
    return { ok: true, ...creada };
  } catch (e) {
    console.error("Error al crear solicitud", e);
    return { ok: false, error: "No se pudo guardar la solicitud. Probá de nuevo." };
  }
}

export type EstadoComentario = { error?: string; enviado?: number };

export async function agregarComentario(
  solicitudId: number,
  _prev: EstadoComentario,
  fd: FormData,
): Promise<EstadoComentario> {
  const u = await requerirUsuario();
  if (!puede(u.rol, "comentar") || !(await puedeVerSolicitud(u, solicitudId))) {
    return { error: "No tenés acceso a esta solicitud." };
  }
  const texto = String(fd.get("texto") ?? "").trim();
  if (!texto) return { error: "Escribí un comentario." };
  if (texto.length > 2000) return { error: "El comentario es demasiado largo (máx. 2000 caracteres)." };

  await db.comentario.create({ data: { solicitudId, usuarioId: u.id, texto } });
  revalidatePath(`/solicitudes/${solicitudId}`);
  return { enviado: Date.now() };
}
