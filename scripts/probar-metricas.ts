// Verifica el cálculo de tiempos por etapa. Uso: npx tsx scripts/probar-metricas.ts
import { promedio, tiemposDeSolicitud, type Movimiento } from "../src/lib/metricas-calculo";

const H = 3_600_000;
const t0 = new Date("2026-01-05T08:00:00-03:00").getTime();
const mov = (horas: number, estadoNuevo: Movimiento["estadoNuevo"], enEspera = false): Movimiento => ({
  estadoNuevo,
  enEspera,
  fecha: new Date(t0 + horas * H),
});

let fallas = 0;
const esperar = (nombre: string, obtenido: unknown, esperado: unknown) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallas++;
  console.log(ok ? "ok   " : "FALLA", nombre, ok ? "" : `-> ${JSON.stringify(obtenido)} (esperado ${JSON.stringify(esperado)})`);
};

// Ingresa, 24 h después pasa a análisis, 10 h de análisis, 48 h en espera, 6 h más de análisis, y avanza.
const conEspera = tiemposDeSolicitud([
  mov(0, "INGRESADA"),
  mov(24, "EN_ANALISIS"),
  mov(34, "EN_ANALISIS", true),
  mov(82, "EN_ANALISIS"),
  mov(88, "MEDICIONES_PLANO"),
]);
esperar("etapa completada", conEspera.porEtapa.INGRESADA, 24 * H);
esperar("la espera no se suma a la etapa", conEspera.porEtapa.EN_ANALISIS, 16 * H);
esperar("la espera se mide aparte", conEspera.espera, 48 * H);
esperar("la etapa en curso no se cuenta", conEspera.porEtapa.MEDICIONES_PLANO, undefined);

// Vuelve a una etapa anterior: el tiempo de las dos pasadas se acumula.
const conRetroceso = tiemposDeSolicitud([
  mov(0, "EN_ANALISIS"),
  mov(5, "MEDICIONES_PLANO"),
  mov(8, "EN_ANALISIS"),
  mov(10, "MEDICIONES_PLANO"),
]);
esperar("retroceso acumula en la etapa", conRetroceso.porEtapa.EN_ANALISIS, 7 * H);
esperar("recién ingresada no tiene tiempos", tiemposDeSolicitud([mov(0, "INGRESADA")]), { porEtapa: {}, espera: 0 });
esperar("promedio", promedio([2, 4, 9]), 5);
esperar("promedio sin datos", promedio([]), null);

console.log(fallas ? `\n${fallas} FALLAS` : "\nMétricas OK");
process.exit(fallas ? 1 : 0);
