"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Estado, Rol } from "@prisma/client";
import { ACCION_ESTADO, nombreEstado } from "@/lib/etiquetas";
import {
  avancesPosibles,
  evaluarCambio,
  puedePonerEnEspera,
  retrocesosPosibles,
  type SolicitudFlujo,
} from "@/lib/estados";
import { cambiarEspera } from "@/server/estados-acciones";
import { DialogoCambioEstado, type CambioPendiente } from "@/components/DialogoCambioEstado";

export function AccionesEstado({
  solicitud,
  flujo,
  rol,
}: {
  solicitud: { id: number; numero: string; sector: string | null; estante: string | null };
  flujo: SolicitudFlujo;
  rol: Rol;
}) {
  const router = useRouter();
  const [cambio, setCambio] = useState<CambioPendiente | null>(null);
  const [pidiendoEspera, setPidiendoEspera] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const avances = avancesPosibles(flujo, rol);
  const retrocesos = retrocesosPosibles(flujo, rol);
  const puedeEspera = puedePonerEnEspera(flujo, rol);

  if (avances.length === 0 && retrocesos.length === 0 && !puedeEspera) return null;

  function pedir(destino: Estado) {
    const ev = evaluarCambio(flujo, rol, destino);
    if (!ev.ok) return setError(ev.error);
    setError("");
    setCambio({
      solicitudId: solicitud.id,
      numero: solicitud.numero,
      destino,
      tipo: ev.tipo,
      requisitos: ev.requisitos,
      sector: solicitud.sector,
      estante: solicitud.estante,
    });
  }

  async function espera(enEspera: boolean, motivo?: string) {
    setEnviando(true);
    setError("");
    const r = await cambiarEspera(solicitud.id, { enEspera, motivo }).catch(() => null);
    setEnviando(false);
    if (!r) return setError("No se pudo conectar con el servidor. Probá de nuevo.");
    if (!r.ok) return setError(r.error);
    setPidiendoEspera(false);
    router.refresh();
  }

  function enviarEspera(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    espera(true, String(new FormData(e.currentTarget).get("motivo") ?? ""));
  }

  return (
    <section className="tarjeta space-y-3">
      <h2 className="titulo-seccion">Acciones</h2>

      {flujo.enEspera ? (
        puedeEspera && (
          <button type="button" className="btn btn-primario w-full" onClick={() => espera(false)} disabled={enviando}>
            {enviando ? "Guardando…" : "Retomar (quitar de espera)"}
          </button>
        )
      ) : (
        <>
          {avances.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {avances.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => pedir(e)}
                  className={`btn sm:flex-1 ${
                    e === "RECHAZADA"
                      ? "border border-red-300 bg-superficie text-red-700 hover:bg-red-50"
                      : "btn-primario"
                  }`}
                >
                  {ACCION_ESTADO[e]}
                </button>
              ))}
            </div>
          )}

          {puedeEspera && !pidiendoEspera && (
            <button type="button" className="btn btn-secundario w-full" onClick={() => setPidiendoEspera(true)}>
              Poner en espera
            </button>
          )}
          {pidiendoEspera && (
            <form onSubmit={enviarEspera} className="space-y-2 rounded-xl bg-amber-50 p-3">
              <label htmlFor="motivo-espera" className="etiqueta">
                ¿Por qué queda en espera? *
              </label>
              <textarea
                id="motivo-espera"
                name="motivo"
                rows={2}
                className="campo"
                maxLength={500}
                required
                autoFocus
                placeholder="Ej: falta información del cliente, falta material…"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secundario flex-1"
                  onClick={() => setPidiendoEspera(false)}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn flex-1 bg-amber-500 text-white hover:bg-amber-600" disabled={enviando}>
                  {enviando ? "Guardando…" : "Poner en espera"}
                </button>
              </div>
            </form>
          )}

          {retrocesos.length > 0 && (
            <div>
              <label htmlFor="retroceso" className="etiqueta">
                Volver a una etapa anterior
              </label>
              <select
                id="retroceso"
                className="campo"
                value=""
                onChange={(e) => e.target.value && pedir(e.target.value as Estado)}
              >
                <option value="">Elegir etapa…</option>
                {retrocesos.map((e) => (
                  <option key={e} value={e}>
                    {nombreEstado(e)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {cambio && (
        <DialogoCambioEstado
          cambio={cambio}
          onCerrar={() => setCambio(null)}
          onHecho={(abrirEtiqueta) => {
            setCambio(null);
            if (abrirEtiqueta) router.push(`/solicitudes/${solicitud.id}/etiqueta`);
            else router.refresh();
          }}
        />
      )}
    </section>
  );
}
