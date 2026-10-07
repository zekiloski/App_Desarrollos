"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subirFoto } from "@/lib/fotos-cliente";
import { BotonesFoto } from "@/components/BotonesFoto";

type FotoVista = { id: number; url: string; urlMiniatura: string };

export function GaleriaFotos({
  solicitudId,
  fotos,
  puedeAgregar,
}: {
  solicitudId: number;
  fotos: FotoVista[];
  puedeAgregar: boolean;
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [progreso, setProgreso] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (abierta === null) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") setAbierta((i) => (i === null ? i : Math.min(i + 1, fotos.length - 1)));
      if (e.key === "ArrowLeft") setAbierta((i) => (i === null ? i : Math.max(i - 1, 0)));
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierta, fotos.length]);

  async function subir(archivos: File[]) {
    setError("");
    let fallidas = 0;
    let ultimoError = "";
    for (let i = 0; i < archivos.length; i++) {
      setProgreso(`Subiendo foto ${i + 1} de ${archivos.length}…`);
      try {
        await subirFoto(solicitudId, archivos[i]);
      } catch (e) {
        fallidas++;
        ultimoError = e instanceof Error ? e.message : "";
      }
    }
    setProgreso("");
    if (fallidas) {
      setError(
        archivos.length === 1
          ? ultimoError || "No se pudo subir la foto."
          : `No se pudieron subir ${fallidas} de ${archivos.length} fotos. ${ultimoError}`,
      );
    }
    router.refresh();
  }

  const actual = abierta === null ? null : fotos[abierta];

  return (
    <div className="space-y-3">
      {fotos.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay fotos.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {fotos.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setAbierta(i)}
                className="block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-slate-100"
                aria-label={`Ver foto ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.urlMiniatura} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {puedeAgregar && <BotonesFoto onArchivos={subir} deshabilitado={progreso !== ""} />}
      {progreso && <p className="text-sm font-medium text-slate-600">{progreso}</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {actual && abierta !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setAbierta(null)}
        >
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-sm font-semibold">
              {abierta + 1} / {fotos.length}
            </span>
            <button type="button" className="btn bg-white/15 text-white" onClick={() => setAbierta(null)}>
              Cerrar
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={actual.url}
              alt=""
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex gap-2 p-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn flex-1 bg-white/15 text-white"
              disabled={abierta === 0}
              onClick={() => setAbierta(abierta - 1)}
            >
              ← Anterior
            </button>
            <button
              type="button"
              className="btn flex-1 bg-white/15 text-white"
              disabled={abierta === fotos.length - 1}
              onClick={() => setAbierta(abierta + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
