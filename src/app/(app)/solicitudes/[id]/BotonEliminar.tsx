"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarSolicitud } from "@/server/solicitudes-acciones";

export function BotonEliminar({ solicitudId, numero }: { solicitudId: number; numero: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function eliminar() {
    if (
      !window.confirm(
        `¿Eliminar la solicitud ${numero}?\n\nSe borran también sus fotos, planos, comentarios e historial. No se puede deshacer.`,
      )
    ) {
      return;
    }
    setEnviando(true);
    setError("");
    const r = await eliminarSolicitud(solicitudId).catch(() => null);
    if (!r || !r.ok) {
      setEnviando(false);
      return setError(r?.error ?? "No se pudo conectar con el servidor. Probá de nuevo.");
    }
    router.replace("/solicitudes");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={eliminar}
        disabled={enviando}
        className="btn btn-secundario w-full border-red-300 text-red-600 hover:bg-red-50"
      >
        {enviando ? "Eliminando…" : "Eliminar solicitud"}
      </button>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
