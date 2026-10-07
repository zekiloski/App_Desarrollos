"use client";

import type { ChangeEvent } from "react";

// Dos entradas separadas: con "capture" el celular abre directo la cámara y no deja elegir de la galería.
export function BotonesFoto({
  onArchivos,
  deshabilitado,
}: {
  onArchivos: (archivos: File[]) => void;
  deshabilitado?: boolean;
}) {
  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (archivos.length) onArchivos(archivos);
  }

  const clase = `btn btn-secundario flex-1 ${deshabilitado ? "pointer-events-none opacity-50" : ""}`;

  return (
    <div className="flex gap-2">
      <label className={clase}>
        Sacar foto
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={alElegir}
          disabled={deshabilitado}
        />
      </label>
      <label className={clase}>
        Elegir de galería
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={alElegir}
          disabled={deshabilitado}
        />
      </label>
    </div>
  );
}
