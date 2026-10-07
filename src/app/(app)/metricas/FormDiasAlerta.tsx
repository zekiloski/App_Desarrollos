"use client";

import { useActionState } from "react";
import { guardarDiasAlerta, type EstadoConfig } from "@/server/admin-acciones";

export function FormDiasAlerta({ dias }: { dias: number }) {
  const [estado, accion, enviando] = useActionState<EstadoConfig, FormData>(guardarDiasAlerta, {});

  return (
    <form action={accion} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="dias-alerta" className="etiqueta">
          Avisar cuando pasen más de (días)
        </label>
        <input
          id="dias-alerta"
          name="dias"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          defaultValue={dias}
          required
          className="campo w-32"
        />
      </div>
      <button type="submit" className="btn btn-secundario" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar"}
      </button>
      {estado.error && (
        <p role="alert" className="w-full text-sm font-medium text-red-600">
          {estado.error}
        </p>
      )}
      {estado.guardado && !estado.error && <p className="w-full text-sm font-medium text-emerald-700">Guardado.</p>}
    </form>
  );
}
