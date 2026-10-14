"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarAvisos } from "@/server/admin-acciones";

function useEliminar() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function eliminar(cuales: number | "todos", pregunta: string) {
    if (!window.confirm(pregunta)) return;
    setEnviando(true);
    setError("");
    const r = await eliminarAvisos(cuales).catch(() => null);
    setEnviando(false);
    if (!r || !r.ok) return setError(r?.error ?? "No se pudo conectar con el servidor. Probá de nuevo.");
    router.refresh();
  }

  return { enviando, error, eliminar };
}

function MensajeError({ texto }: { texto: string }) {
  return texto ? (
    <span role="alert" className="text-sm font-medium text-red-600">
      {texto}
    </span>
  ) : null;
}

// Papelera de cada aviso de la lista.
export function EliminarAviso({ id, asunto }: { id: number; asunto: string }) {
  const { enviando, error, eliminar } = useEliminar();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => eliminar(id, `¿Eliminar el aviso "${asunto}"? No se puede deshacer.`)}
        disabled={enviando}
        aria-label="Eliminar aviso"
        title="Eliminar aviso"
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
        </svg>
      </button>
      <MensajeError texto={error} />
    </div>
  );
}

// Vacía la lista completa de una vez.
export function EliminarTodos({ cantidad }: { cantidad: number }) {
  const { enviando, error, eliminar } = useEliminar();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() =>
          eliminar(
            "todos",
            `¿Eliminar los ${cantidad} avisos? Se borran también los pendientes y con error, que ya no se van a enviar. No se puede deshacer.`,
          )
        }
        disabled={enviando}
        className="btn btn-secundario border-red-300 text-red-600 hover:bg-red-50"
      >
        {enviando ? "Eliminando…" : "Eliminar todos"}
      </button>
      <MensajeError texto={error} />
    </div>
  );
}
