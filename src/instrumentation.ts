// Next.js ejecuta register() una vez al arrancar el servidor, lo inicie como lo inicie el hosting.
// Se aprovecha para dejar la base lista (tablas y datos iniciales) antes de atender pedidos.
export async function register() {
  // Esta forma exacta (if + import dentro) es la que Next.js descarta al compilar para el runtime "edge".
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { prepararBase } = await import("./lib/preparar-base");
      await prepararBase();
    } catch (e) {
      // No se corta el arranque: el error queda en los registros y /api/cron/diagnostico lo muestra.
      console.error("[base] No se pudo preparar la base de datos:", e);
    }
  }
}
