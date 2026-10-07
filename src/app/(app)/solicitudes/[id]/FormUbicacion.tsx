"use client";

import { useActionState, useEffect, useRef } from "react";
import { registrarUbicacion, type EstadoUbicacion } from "@/server/estados-acciones";

export function FormUbicacion({
  solicitudId,
  actual,
  sectores,
  personas,
}: {
  solicitudId: number;
  actual: { sector: string | null; estante: string | null; tenidaPorId: number | null };
  sectores: string[];
  personas: { id: number; nombre: string }[];
}) {
  const [estado, accion, enviando] = useActionState<EstadoUbicacion, FormData>(
    registrarUbicacion.bind(null, solicitudId),
    {},
  );
  const detalle = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (estado.guardado && detalle.current) detalle.current.open = false;
  }, [estado.guardado]);

  return (
    <details ref={detalle} className="mt-3">
      <summary className="btn btn-secundario w-full list-none [&::-webkit-details-marker]:hidden">
        Cambiar ubicación
      </summary>
      {/* La key reinicia los campos con los valores recién guardados. */}
      <form action={accion} key={estado.guardado ?? 0} className="mt-3 space-y-3">
        <div>
          <label htmlFor="ubi-sector" className="etiqueta">
            Sector
          </label>
          <input
            id="ubi-sector"
            name="sector"
            list="lista-sectores"
            className="campo"
            defaultValue={actual.sector ?? ""}
            maxLength={100}
            autoComplete="off"
          />
          <datalist id="lista-sectores">
            {sectores.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="ubi-estante" className="etiqueta">
            Estante / lugar
          </label>
          <input
            id="ubi-estante"
            name="estante"
            className="campo"
            defaultValue={actual.estante ?? ""}
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="ubi-persona" className="etiqueta">
            ¿Quién la tiene?
          </label>
          <select id="ubi-persona" name="tenidaPorId" className="campo" defaultValue={actual.tenidaPorId ?? ""}>
            <option value="">Nadie en particular</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        {estado.error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {estado.error}
          </p>
        )}
        <button type="submit" className="btn btn-primario w-full" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar ubicación"}
        </button>
      </form>
    </details>
  );
}
