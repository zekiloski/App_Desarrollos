"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { corregirCodigo } from "@/server/tecnico-acciones";

export function CorregirCodigo({ solicitudId, codigo }: { solicitudId: number; codigo: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    const nuevo = String(new FormData(e.currentTarget).get("codigo") ?? "");
    const r = await corregirCodigo(solicitudId, nuevo).catch(() => null);
    setEnviando(false);
    if (!r) return setError("No se pudo conectar con el servidor. Probá de nuevo.");
    if (!r.ok) return setError(r.error);
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <button type="button" className="text-sm font-semibold text-blue-700" onClick={() => setEditando(true)}>
        Corregir código
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-2">
      <label htmlFor="corregir-codigo" className="sr-only">
        Código de pieza
      </label>
      <input
        id="corregir-codigo"
        name="codigo"
        className="campo font-mono"
        defaultValue={codigo}
        maxLength={100}
        required
        autoFocus
        autoComplete="off"
      />
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secundario flex-1" onClick={() => setEditando(false)} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primario flex-1" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
