"use client";

export function BotonImprimir() {
  return (
    <button type="button" className="btn btn-primario w-full sm:w-auto" onClick={() => window.print()}>
      Imprimir etiqueta
    </button>
  );
}
