import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { diasAlerta } from "@/lib/config";
import { condicionDetenidas } from "@/lib/filtros";
import { nombreEstado } from "@/lib/etiquetas";
import { crearAvisos, enviarPendientes } from "@/lib/notificaciones";

const CLAVE_ULTIMO = "ultimo_resumen_detenidas";

function claveValida(recibida: string | null) {
  const esperada = process.env.CRON_SECRET;
  if (!esperada || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Tarea diaria, pensada para un "cron job" del hosting:
//   https://.../api/cron/diario?clave=CRON_SECRET
// Manda a Oficina Técnica y Gerencia el resumen de piezas detenidas (una vez por día) y reintenta avisos pendientes.
// No usa sesión: se protege con la clave. Sin CRON_SECRET configurado, la ruta no existe.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!claveValida(url.searchParams.get("clave"))) return new NextResponse("No encontrado", { status: 404 });

  const hoy = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
  const ultimo = await db.configuracion.findUnique({ where: { clave: CLAVE_ULTIMO } });
  let resumen = "ya enviado hoy";

  if (ultimo?.valor !== hoy) {
    const dias = await diasAlerta();
    const detenidas = await db.solicitud.findMany({
      where: condicionDetenidas(dias),
      orderBy: { fechaUltimoMovimiento: "asc" },
      take: 100,
      select: {
        numero: true,
        estado: true,
        enEspera: true,
        fechaUltimoMovimiento: true,
        cliente: { select: { nombre: true } },
      },
    });

    if (detenidas.length > 0) {
      const base = (process.env.APP_URL || url.origin).replace(/\/+$/, "");
      const destinatarios = await db.usuario.findMany({
        where: { rol: { in: ["OFICINA_TECNICA", "ADMIN"] }, activo: true },
        select: { id: true },
      });
      const lineas = detenidas.map((s) => {
        const d = Math.floor((Date.now() - s.fechaUltimoMovimiento.getTime()) / 86_400_000);
        return `- ${s.numero} · ${s.cliente.nombre} · ${nombreEstado(s.estado)}${s.enEspera ? " (en espera)" : ""} · ${d} días`;
      });
      await crearAvisos(
        destinatarios.map((x) => x.id),
        {
          asunto: `${detenidas.length} ${detenidas.length === 1 ? "solicitud detenida" : "solicitudes detenidas"} hace más de ${dias} días`,
          cuerpo: [
            `Solicitudes abiertas sin movimiento hace más de ${dias} días:`,
            "",
            ...lineas,
            "",
            `Ver el listado: ${base}/solicitudes?detenidas=1`,
          ].join("\n"),
        },
      );
    }
    await db.configuracion.upsert({
      where: { clave: CLAVE_ULTIMO },
      update: { valor: hoy },
      create: { clave: CLAVE_ULTIMO, valor: hoy },
    });
    resumen = `${detenidas.length} detenidas`;
  }

  const envio = await enviarPendientes(200);
  return NextResponse.json({ resumen, ...envio });
}
