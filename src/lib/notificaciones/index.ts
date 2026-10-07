import type { CanalNotificacion } from "@prisma/client";
import { db } from "../db";
import { canalEmail } from "./email";
import { canalWhatsapp } from "./whatsapp";

// Los avisos se guardan primero en la base (tabla Notificacion) y después se envían.
// Así un problema con el correo nunca hace fallar la acción del usuario, y lo no enviado se puede reintentar.

export type Canal = {
  configurado: () => boolean;
  enviar: (destino: { email: string; telefono: string | null }, asunto: string, cuerpo: string) => Promise<void>;
};

const CANALES: Record<CanalNotificacion, Canal> = { EMAIL: canalEmail, WHATSAPP: canalWhatsapp };

export async function crearAvisos(
  usuarioIds: number[],
  aviso: { solicitudId?: number; asunto: string; cuerpo: string; canal?: CanalNotificacion },
) {
  const ids = [...new Set(usuarioIds)];
  if (ids.length === 0) return;
  const activos = await db.usuario.findMany({ where: { id: { in: ids }, activo: true }, select: { id: true } });
  if (activos.length === 0) return;
  await db.notificacion.createMany({
    data: activos.map((u) => ({
      usuarioId: u.id,
      solicitudId: aviso.solicitudId,
      canal: aviso.canal ?? "EMAIL",
      asunto: aviso.asunto.slice(0, 200),
      cuerpo: aviso.cuerpo,
    })),
  });
}

// Envía lo pendiente. Si el canal no está configurado, los avisos quedan pendientes sin marcar error.
export async function enviarPendientes(limite = 50) {
  const pendientes = await db.notificacion.findMany({
    where: { estado: "PENDIENTE" },
    orderBy: { id: "asc" },
    take: limite,
    include: { usuario: { select: { email: true, telefono: true } } },
  });

  let enviadas = 0;
  let conError = 0;
  for (const n of pendientes) {
    const canal = CANALES[n.canal];
    if (!canal.configurado()) continue;
    try {
      await canal.enviar(n.usuario, n.asunto, n.cuerpo);
      await db.notificacion.update({ where: { id: n.id }, data: { estado: "ENVIADA", enviadaEl: new Date(), error: null } });
      enviadas++;
    } catch (e) {
      const error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      await db.notificacion.update({ where: { id: n.id }, data: { estado: "ERROR", error } });
      conError++;
    }
  }
  return { enviadas, conError, sinEnviar: pendientes.length - enviadas - conError };
}

// Para llamar dentro de after(): nunca lanza.
export async function enviarPendientesSinFallar() {
  try {
    await enviarPendientes();
  } catch (e) {
    console.error("Error al enviar avisos", e);
  }
}
