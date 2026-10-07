"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { eliminarAdjunto } from "@/server/tecnico-acciones";

export type AdjuntoVista = {
  id: number;
  nombre: string;
  tipo: "PLANO" | "IMAGEN" | "DOCUMENTO";
  tamano: string;
  detalle: string;
};

const TIPO = { PLANO: "Plano", IMAGEN: "Imagen", DOCUMENTO: "Documento" };
const COLOR_TIPO = {
  PLANO: "bg-indigo-100 text-indigo-800",
  IMAGEN: "bg-sky-100 text-sky-800",
  DOCUMENTO: "bg-slate-100 text-slate-700",
};

export function Adjuntos({
  solicitudId,
  adjuntos,
  puedeEditar,
  extensiones,
}: {
  solicitudId: number;
  adjuntos: AdjuntoVista[];
  puedeEditar: boolean;
  extensiones: string[];
}) {
  const router = useRouter();
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState("");

  async function subir(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!archivos.length) return;
    setError("");
    const errores: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}: ${archivos[i].name}`);
      const fd = new FormData();
      fd.append("archivo", archivos[i]);
      try {
        const r = await fetch(`/api/solicitudes/${solicitudId}/adjuntos`, { method: "POST", body: fd });
        if (!r.ok) {
          const cuerpo = await r.json().catch(() => null);
          errores.push(`${archivos[i].name}: ${cuerpo?.error ?? "no se pudo subir."}`);
        }
      } catch {
        errores.push(`${archivos[i].name}: sin conexión con el servidor.`);
      }
    }
    setProgreso("");
    setError(errores.join(" "));
    router.refresh();
  }

  async function eliminar(a: AdjuntoVista) {
    if (!window.confirm(`¿Eliminar "${a.nombre}"? No se puede deshacer.`)) return;
    setError("");
    const r = await eliminarAdjunto(a.id).catch(() => null);
    if (!r || !r.ok) setError(r?.error ?? "No se pudo eliminar el archivo.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {adjuntos.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay planos ni documentos.</p>
      ) : (
        <ul className="divide-y divide-slate-200">
          {adjuntos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/adjuntos/${a.id}`}
                  target="_blank"
                  rel="noopener"
                  className="font-semibold break-all text-blue-700 underline-offset-2 hover:underline"
                >
                  {a.nombre}
                </a>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span className={`chip ${COLOR_TIPO[a.tipo]}`}>{TIPO[a.tipo]}</span>
                  <span>
                    {a.tamano} · {a.detalle}
                  </span>
                </div>
              </div>
              {puedeEditar && (
                <button
                  type="button"
                  onClick={() => eliminar(a)}
                  aria-label={`Eliminar ${a.nombre}`}
                  className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-lg font-bold text-red-600 hover:bg-red-50"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeEditar && (
        <>
          <label className={`btn btn-secundario w-full sm:w-auto ${progreso ? "pointer-events-none opacity-50" : ""}`}>
            Adjuntar planos o documentos
            <input
              type="file"
              multiple
              accept={extensiones.map((x) => `.${x}`).join(",")}
              className="sr-only"
              onChange={subir}
              disabled={!!progreso}
            />
          </label>
          <p className="text-xs text-slate-500">PDF, DWG, DXF, STEP, IGES, imágenes y documentos de Office. Máximo 25 MB por archivo.</p>
        </>
      )}
      {progreso && <p className="text-sm font-medium text-slate-600">{progreso}</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
