"use client";

import { useActionState } from "react";
import { enviarAvisosPendientes, type EstadoEnvio } from "@/server/admin-acciones";

export function BotonEnviarAvisos() {
  const [estado, accion, enviando] = useActionState<EstadoEnvio, FormData>(enviarAvisosPendientes, {});

  return (
    <form action={accion} className="flex flex-wrap items-center gap-3">
      <button type="submit" className="btn btn-secundario" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar pendientes y reintentar errores"}
      </button>
      {estado.mensaje && <span className="text-sm font-medium text-slate-700">{estado.mensaje}</span>}
      {estado.error && (
        <span role="alert" className="text-sm font-medium text-red-600">
          {estado.error}
        </span>
      )}
    </form>
  );
}
