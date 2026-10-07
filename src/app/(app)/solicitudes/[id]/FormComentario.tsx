"use client";

import { useActionState, useEffect, useRef } from "react";
import { agregarComentario, type EstadoComentario } from "@/server/solicitudes-acciones";

export function FormComentario({ solicitudId }: { solicitudId: number }) {
  const [estado, accion, enviando] = useActionState<EstadoComentario, FormData>(
    agregarComentario.bind(null, solicitudId),
    {},
  );
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.enviado) form.current?.reset();
  }, [estado.enviado]);

  return (
    <form ref={form} action={accion} className="space-y-2">
      <label htmlFor="texto" className="sr-only">
        Nuevo comentario
      </label>
      <textarea
        id="texto"
        name="texto"
        rows={2}
        maxLength={2000}
        required
        className="campo"
        placeholder="Escribí un comentario…"
      />
      {estado.error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {estado.error}
        </p>
      )}
      <button type="submit" className="btn btn-primario w-full sm:w-auto" disabled={enviando}>
        {enviando ? "Enviando…" : "Comentar"}
      </button>
    </form>
  );
}
