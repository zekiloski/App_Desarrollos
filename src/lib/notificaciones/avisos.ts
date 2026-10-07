import { after } from "next/server";
import { db } from "../db";
import { urlBase } from "../url";
import { crearAvisos, enviarPendientesSinFallar } from "./index";

// Avisos que disparan las acciones. Ninguno lanza: un problema al avisar no debe frenar la acción.
// El envío real se hace después de responderle al usuario, para no demorarlo.

async function conAviso(crear: () => Promise<void>) {
  try {
    await crear();
    after(enviarPendientesSinFallar);
  } catch (e) {
    console.error("No se pudo crear el aviso", e);
  }
}

async function datos(solicitudId: number) {
  const s = await db.solicitud.findUnique({
    where: { id: solicitudId },
    select: {
      numero: true,
      descripcion: true,
      vendedorId: true,
      cliente: { select: { nombre: true } },
      vendedor: { select: { nombre: true } },
    },
  });
  if (!s) return null;
  return { ...s, enlace: `${await urlBase()}/solicitudes/${solicitudId}` };
}

const resumen = (t: string) => (t.length > 300 ? `${t.slice(0, 300)}…` : t);

// A Oficina Técnica, cuando entra una solicitud nueva.
export function avisarNuevaSolicitud(solicitudId: number, actorId: number) {
  return conAviso(async () => {
    const s = await datos(solicitudId);
    if (!s) return;
    const destinatarios = await db.usuario.findMany({
      where: { rol: "OFICINA_TECNICA", activo: true, NOT: { id: actorId } },
      select: { id: true },
    });
    await crearAvisos(
      destinatarios.map((d) => d.id),
      {
        solicitudId,
        asunto: `Nueva solicitud ${s.numero} — ${s.cliente.nombre}`,
        cuerpo: [
          `Ingresó una solicitud nueva: ${s.numero}`,
          `Cliente: ${s.cliente.nombre}`,
          `Vendedor: ${s.vendedor.nombre}`,
          "",
          resumen(s.descripcion),
          "",
          `Ver la ficha: ${s.enlace}`,
        ].join("\n"),
      },
    );
  });
}

// Al vendedor, cuando su solicitud cambia. No se avisa si el cambio lo hizo él mismo.
// "novedad" completa la frase "Tu solicitud ND-… {novedad}", p. ej. 'pasó a "Aprobada"'.
export function avisarCambio(solicitudId: number, actorId: number, novedad: string, motivo?: string | null) {
  return conAviso(async () => {
    const s = await datos(solicitudId);
    if (!s || s.vendedorId === actorId) return;
    const actor = await db.usuario.findUnique({ where: { id: actorId }, select: { nombre: true } });
    await crearAvisos([s.vendedorId], {
      solicitudId,
      asunto: `${s.numero} ${novedad} — ${s.cliente.nombre}`,
      cuerpo: [
        `Tu solicitud ${s.numero} (${s.cliente.nombre}) ${novedad}.`,
        motivo ? `Motivo: ${motivo}` : null,
        actor ? `Lo registró: ${actor.nombre}` : null,
        "",
        resumen(s.descripcion),
        "",
        `Ver la ficha: ${s.enlace}`,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    });
  });
}
