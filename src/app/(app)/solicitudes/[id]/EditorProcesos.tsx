"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarProcesos } from "@/server/tecnico-acciones";

type Proceso = { id: number; nombre: string };

export function EditorProcesos({
  solicitudId,
  asignados,
  catalogo,
  puedeEditar,
  puedeCatalogo,
}: {
  solicitudId: number;
  // En orden de fabricación. Un mismo proceso puede repetirse (p. ej. soldar, pintar, volver a soldar).
  asignados: Proceso[];
  catalogo: Proceso[];
  puedeEditar: boolean;
  puedeCatalogo: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [lista, setLista] = useState<Proceso[]>(asignados);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    const copia = [...lista];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setLista(copia);
  }

  async function guardar() {
    setEnviando(true);
    setError("");
    const r = await guardarProcesos(solicitudId, lista.map((p) => p.id)).catch(() => null);
    setEnviando(false);
    if (!r) return setError("No se pudo conectar con el servidor. Probá de nuevo.");
    if (!r.ok) return setError(r.error);
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <div>
        {asignados.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no se definieron los procesos.</p>
        ) : (
          <ol className="space-y-2">
            {asignados.map((p, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                  {i + 1}
                </span>
                <span className="font-medium">{p.nombre}</span>
              </li>
            ))}
          </ol>
        )}
        {puedeEditar && (
          <button
            type="button"
            className="btn btn-secundario mt-4 w-full sm:w-auto"
            onClick={() => {
              setLista(asignados);
              setError("");
              setEditando(true);
            }}
          >
            {asignados.length ? "Editar procesos" : "Definir procesos"}
          </button>
        )}
      </div>
    );
  }

  const botonChico =
    "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-lg font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="space-y-3">
      {lista.length === 0 ? (
        <p className="text-sm text-slate-500">Agregá los procesos en el orden en que se fabrica la pieza.</p>
      ) : (
        <ol className="space-y-2">
          {lista.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{p.nombre}</span>
              <button type="button" className={botonChico} onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${p.nombre}`}>
                ↑
              </button>
              <button
                type="button"
                className={botonChico}
                onClick={() => mover(i, 1)}
                disabled={i === lista.length - 1}
                aria-label={`Bajar ${p.nombre}`}
              >
                ↓
              </button>
              <button
                type="button"
                className={`${botonChico} text-red-600`}
                onClick={() => setLista(lista.filter((_, k) => k !== i))}
                aria-label={`Quitar ${p.nombre}`}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <div>
        <label htmlFor="agregar-proceso" className="etiqueta">
          Agregar proceso
        </label>
        <select
          id="agregar-proceso"
          className="campo"
          value=""
          onChange={(e) => {
            const p = catalogo.find((x) => x.id === Number(e.target.value));
            if (p) setLista([...lista, p]);
          }}
        >
          <option value="">Elegir…</option>
          {catalogo.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        {puedeCatalogo && (
          <Link href="/admin/procesos" className="mt-1 inline-block text-sm font-semibold text-blue-700">
            ¿Falta un proceso? Editar la lista
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secundario flex-1" onClick={() => setEditando(false)} disabled={enviando}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primario flex-1" onClick={guardar} disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar procesos"}
        </button>
      </div>
    </div>
  );
}
