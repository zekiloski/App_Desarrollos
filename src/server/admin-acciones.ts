"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { CLAVE_DIAS_ALERTA } from "@/lib/config";
import { enviarPendientes } from "@/lib/notificaciones";

export type EstadoConfig = { error?: string; guardado?: number };

export async function guardarDiasAlerta(_prev: EstadoConfig, fd: FormData): Promise<EstadoConfig> {
  const u = await requerirUsuario();
  if (!puede(u.rol, "admin")) return { error: "Solo Gerencia / Admin puede cambiar la configuración." };

  const dias = Number(fd.get("dias"));
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) return { error: "Ingresá una cantidad de días entre 1 y 365." };

  await db.configuracion.upsert({
    where: { clave: CLAVE_DIAS_ALERTA },
    update: { valor: String(dias) },
    create: { clave: CLAVE_DIAS_ALERTA, valor: String(dias) },
  });

  revalidatePath("/metricas");
  revalidatePath("/solicitudes");
  return { guardado: Date.now() };
}

export type EstadoEnvio = { mensaje?: string; error?: string };

// Reintenta los avisos con error y envía todo lo pendiente.
export async function enviarAvisosPendientes(_prev: EstadoEnvio, _fd: FormData): Promise<EstadoEnvio> {
  const u = await requerirUsuario();
  if (!puede(u.rol, "admin")) return { error: "Solo Gerencia / Admin puede enviar avisos." };

  await db.notificacion.updateMany({ where: { estado: "ERROR" }, data: { estado: "PENDIENTE" } });
  const r = await enviarPendientes(200);
  revalidatePath("/admin/avisos");

  if (r.enviadas === 0 && r.conError === 0 && r.sinEnviar === 0) return { mensaje: "No había avisos pendientes." };
  const partes = [`${r.enviadas} enviados`];
  if (r.conError) partes.push(`${r.conError} con error`);
  if (r.sinEnviar) partes.push(`${r.sinEnviar} sin enviar porque el correo no está configurado`);
  return { mensaje: `${partes.join(", ")}.` };
}
