"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { guardarProcesoCatalogo } from "@/server/tecnico-acciones";

type Proceso = { id: number; nombre: string; activo: boolean; usos: number };

export function ListaProcesos({ procesos }: { procesos: Proceso[] }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(id: number | null, nombre: string, activo: boolean) {
    setEnviando(true);
    setError("");
    const r = await guardarProcesoCatalogo(id, { nombre, activo }).catch(() => null);
    setEnviando(false);
    if (!r || !r.ok) {
      setError(r?.error ?? "No se pudo conectar con el servidor. Probá de nuevo.");
      return false;
    }
    setEditandoId(null);
    router.refresh();
    return true;
  }

  async function agregar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (await guardar(null, String(new FormData(form).get("nombre") ?? ""), true)) form.reset();
  }

  function renombrar(e: FormEvent<HTMLFormElement>, p: Proceso) {
    e.preventDefault();
    guardar(p.id, String(new FormData(e.currentTarget).get("nombre") ?? ""), p.activo);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={agregar} className="tarjeta flex gap-2">
        <label htmlFor="nuevo-proceso" className="sr-only">
          Nuevo proceso
        </label>
        <input
          id="nuevo-proceso"
          name="nombre"
          className="campo flex-1"
          placeholder="Nuevo proceso…"
          maxLength={100}
          required
        />
        <button type="submit" className="btn btn-primario" disabled={enviando}>
          Agregar
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <ul className="tarjeta divide-y divide-slate-200 py-1!">
        {procesos.map((p) => (
          <li key={p.id} className="py-3">
            {editandoId === p.id ? (
              <form onSubmit={(e) => renombrar(e, p)} className="flex flex-wrap gap-2">
                <input
                  name="nombre"
                  className="campo min-w-0 flex-1"
                  defaultValue={p.nombre}
                  maxLength={100}
                  required
                  autoFocus
                  aria-label="Nombre del proceso"
                />
                <button type="submit" className="btn btn-primario" disabled={enviando}>
                  Guardar
                </button>
                <button type="button" className="btn btn-secundario" onClick={() => setEditandoId(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className={`min-w-0 flex-1 ${p.activo ? "" : "opacity-50"}`}>
                  <div className="font-semibold">{p.nombre}</div>
                  <div className="text-xs text-slate-500">
                    {p.usos === 0 ? "Sin uso" : p.usos === 1 ? "Usado en 1 pieza" : `Usado en ${p.usos} piezas`}
                    {!p.activo && " · Desactivado"}
                  </div>
                </div>
                <button
                  type="button"
                  className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setError("");
                    setEditandoId(p.id);
                  }}
                >
                  Renombrar
                </button>
                <button
                  type="button"
                  className="min-h-11 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => guardar(p.id, p.nombre, !p.activo)}
                  disabled={enviando}
                >
                  {p.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
