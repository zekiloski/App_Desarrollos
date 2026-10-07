"use client";

import { useState, type FormEvent } from "react";
import type { Estado } from "@prisma/client";
import { ACCION_ESTADO, nombreEstado } from "@/lib/etiquetas";
import type { DecisionEtiqueta, Requisito } from "@/lib/estados";
import { cambiarEstado } from "@/server/estados-acciones";

export type CambioPendiente = {
  solicitudId: number;
  numero: string;
  destino: Estado;
  tipo: "avance" | "retroceso";
  requisitos: Requisito[];
  sector?: string | null;
  estante?: string | null;
};

// Confirma un cambio de etapa y pide lo que esa etapa exige (motivo, ubicación o código).
export function DialogoCambioEstado({
  cambio,
  onCerrar,
  onHecho,
}: {
  cambio: CambioPendiente;
  onCerrar: () => void;
  // abrirEtiqueta: se eligió generar la etiqueta QR; quien usa el diálogo debe llevar a esa pantalla.
  onHecho: (abrirEtiqueta: boolean) => void;
}) {
  // Al recibir la pieza se puede dejar la etiqueta para después; antes de análisis hay que decidir.
  const puedePostergar = cambio.destino === "RECIBIDA_EN_PLANTA";
  const [etiqueta, setEtiqueta] = useState<DecisionEtiqueta | "">("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const pide = (r: Requisito) => cambio.requisitos.includes(r);
  const retroceso = cambio.tipo === "retroceso";
  const rechazo = cambio.destino === "RECHAZADA";

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const txt = (k: string) => String(fd.get(k) ?? "");
    if (pide("etiqueta") && !etiqueta) return setError("Indicá si se genera la etiqueta con QR.");
    setEnviando(true);
    setError("");
    const r = await cambiarEstado(cambio.solicitudId, {
      destino: cambio.destino,
      motivo: txt("motivo"),
      sector: txt("sector"),
      estante: txt("estante"),
      codigoPieza: txt("codigoPieza"),
      etiqueta: etiqueta || undefined,
    }).catch(() => null);
    setEnviando(false);
    if (!r) return setError("No se pudo conectar con el servidor. Probá de nuevo.");
    if (!r.ok) return setError(r.error);
    onHecho(pide("etiqueta") && etiqueta === "SI");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-cambio"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={enviando ? undefined : onCerrar}
    >
      <form
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-t-2xl bg-superficie p-5 shadow-xl sm:rounded-2xl"
      >
        <div>
          <h2 id="titulo-cambio" className="text-lg font-bold">
            {retroceso ? `Volver a "${nombreEstado(cambio.destino)}"` : ACCION_ESTADO[cambio.destino]}
          </h2>
          <p className="text-sm text-slate-500">Solicitud {cambio.numero}</p>
        </div>

        {pide("ubicacion") && (
          <>
            <div>
              <label htmlFor="dlg-sector" className="etiqueta">
                Sector donde queda la pieza *
              </label>
              <input
                id="dlg-sector"
                name="sector"
                className="campo"
                defaultValue={cambio.sector ?? ""}
                placeholder="Ej: Oficina Técnica, Depósito, Plegado…"
                maxLength={100}
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="dlg-estante" className="etiqueta">
                Estante / lugar
              </label>
              <input
                id="dlg-estante"
                name="estante"
                className="campo"
                defaultValue={cambio.estante ?? ""}
                placeholder="Ej: Estante 3, caja azul…"
                maxLength={100}
              />
            </div>
          </>
        )}

        {pide("etiqueta") && (
          <div>
            <span className="etiqueta">¿Generar la etiqueta con QR para pegar en la pieza? *</span>
            {!puedePostergar && (
              <p className="mb-2 text-sm text-slate-500">
                Esta pieza todavía no tiene etiqueta. Antes de pasarla a análisis hay que resolverlo.
              </p>
            )}
            <div className={`grid gap-2 ${puedePostergar ? "grid-cols-3" : "grid-cols-2"}`} role="radiogroup" aria-label="Etiqueta con QR">
              {(
                [
                  ["SI", "Sí, ahora"],
                  ...(puedePostergar ? [["DESPUES", "Más tarde"]] : []),
                  ["NO", "No hace falta"],
                ] as [DecisionEtiqueta, string][]
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={etiqueta === valor}
                  onClick={() => setEtiqueta(valor)}
                  className={`min-h-12 cursor-pointer rounded-xl border-2 px-2 text-sm font-semibold ${
                    etiqueta === valor
                      ? "border-blue-700 bg-blue-50 text-blue-800"
                      : "border-slate-300 bg-superficie text-slate-700"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {etiqueta === "SI" && "Al confirmar se abre la etiqueta lista para imprimir."}
              {etiqueta === "DESPUES" && "Se va a volver a preguntar antes de pasar la pieza a análisis técnico."}
              {etiqueta === "NO" && "La pieza queda sin etiqueta. Se puede generar igual más adelante desde la ficha."}
            </p>
          </div>
        )}

        {pide("codigo") && (
          <div>
            <label htmlFor="dlg-codigo" className="etiqueta">
              Código de pieza *
            </label>
            <input
              id="dlg-codigo"
              name="codigoPieza"
              className="campo font-mono"
              maxLength={100}
              required
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
            />
            <p className="mt-1 text-sm text-slate-500">
              Formato libre. Solo se controla que no esté usado en otra solicitud.
            </p>
          </div>
        )}

        {pide("motivo") ? (
          <div>
            <label htmlFor="dlg-motivo" className="etiqueta">
              {rechazo ? "Motivo del rechazo *" : "Motivo *"}
            </label>
            <textarea id="dlg-motivo" name="motivo" rows={3} className="campo" maxLength={500} required autoFocus />
          </div>
        ) : (
          <div>
            <label htmlFor="dlg-motivo" className="etiqueta">
              Observación <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="dlg-motivo" name="motivo" rows={2} className="campo" maxLength={500} />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="button" className="btn btn-secundario flex-1" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button
            type="submit"
            className={`btn flex-1 text-white ${rechazo ? "bg-peligro hover:bg-peligro-fuerte" : "bg-marca hover:bg-marca-fuerte"}`}
            disabled={enviando}
          >
            {enviando ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
