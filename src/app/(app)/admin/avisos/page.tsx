import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/auth";
import { emailConfigurado } from "@/lib/notificaciones/email";
import { fechaHora } from "@/lib/formato";
import { BotonEnviarAvisos } from "./BotonEnviarAvisos";

export const metadata: Metadata = { title: "Avisos" };

const ESTADO = {
  PENDIENTE: { nombre: "Pendiente", color: "bg-amber-100 text-amber-800" },
  ENVIADA: { nombre: "Enviado", color: "bg-emerald-100 text-emerald-800" },
  ERROR: { nombre: "Error", color: "bg-red-100 text-red-700" },
};

export default async function PaginaAvisos() {
  await requerirPermiso("admin");
  const [avisos, porEstado] = await Promise.all([
    db.notificacion.findMany({
      orderBy: { id: "desc" },
      take: 100,
      include: { usuario: { select: { nombre: true, email: true } }, solicitud: { select: { id: true } } },
    }),
    db.notificacion.groupBy({ by: ["estado"], _count: true }),
  ]);
  const cantidad = (e: keyof typeof ESTADO) => porEstado.find((x) => x.estado === e)?._count ?? 0;
  const configurado = emailConfigurado();
  const porEnviar = cantidad("PENDIENTE") + cantidad("ERROR");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Avisos por email</h1>
        <p className="text-sm text-slate-500">
          Se avisa a Oficina Técnica cuando entra una solicitud y al vendedor cuando la suya cambia de etapa.
        </p>
      </div>

      {configurado ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          El correo está configurado: los avisos se envían solos.
        </p>
      ) : (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          El correo todavía no está configurado, así que los avisos quedan guardados como pendientes y no se
          envían. Para activarlo hay que completar SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y SMTP_FROM en el
          archivo .env y reiniciar la app.
        </p>
      )}

      <div className="tarjeta flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="text-sm">
          <strong className="tabular-nums">{cantidad("ENVIADA")}</strong> enviados ·{" "}
          <strong className="tabular-nums">{cantidad("PENDIENTE")}</strong> pendientes ·{" "}
          <strong className="tabular-nums">{cantidad("ERROR")}</strong> con error
        </div>
        {porEnviar > 0 && <BotonEnviarAvisos />}
      </div>

      {avisos.length === 0 ? (
        <div className="tarjeta py-10 text-center text-slate-500">Todavía no se generó ningún aviso.</div>
      ) : (
        <ul className="tarjeta divide-y divide-slate-200 py-1!">
          {avisos.map((a) => (
            <li key={a.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${ESTADO[a.estado].color}`}>{ESTADO[a.estado].nombre}</span>
                <span className="text-xs text-slate-500">{fechaHora(a.creadaEl)}</span>
              </div>
              <div className="mt-1 font-semibold break-words">
                {a.solicitud ? (
                  <Link href={`/solicitudes/${a.solicitud.id}`} className="text-blue-700 hover:underline">
                    {a.asunto}
                  </Link>
                ) : (
                  a.asunto
                )}
              </div>
              <div className="text-sm text-slate-600">
                Para {a.usuario.nombre} <span className="text-slate-500">({a.usuario.email})</span>
              </div>
              {a.error && <div className="mt-1 text-sm break-words text-red-600">{a.error}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
