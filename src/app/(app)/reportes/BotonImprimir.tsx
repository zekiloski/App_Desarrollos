"use client";

// Abre el diálogo de impresión, desde donde se guarda como PDF. Se imprime siempre en tema claro:
// en oscuro los textos claros quedarían ilegibles sobre el papel blanco.
export function BotonImprimir() {
  function imprimir() {
    const raiz = document.documentElement;
    const oscuro = raiz.classList.contains("dark");
    if (oscuro) {
      raiz.classList.remove("dark");
      window.addEventListener("afterprint", () => raiz.classList.add("dark"), { once: true });
    }
    window.print();
  }

  return (
    <button type="button" onClick={imprimir} className="btn btn-secundario">
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
        <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z" />
      </svg>
      Imprimir / PDF
    </button>
  );
}
