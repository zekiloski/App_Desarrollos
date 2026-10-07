import type { Estado, TipoIngreso } from "@prisma/client";
import { nombreEstado } from "@/lib/etiquetas";
import { recorrido } from "@/lib/estados";

const CORTO: Record<Estado, string> = {
  INGRESADA: "Ingresada",
  RECIBIDA_EN_PLANTA: "Recibida",
  EN_ANALISIS: "Análisis",
  MEDICIONES_PLANO: "Mediciones",
  DEFINICION_PROCESOS: "Procesos",
  EVALUACION_MATRIZ: "Matriz",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CODIGO_CREADO: "Código",
  CARGADA_EN_PRODUCCION: "En producción",
  CERRADA: "Cerrada",
};

// Línea de avance de una solicitud: un punto por etapa, de izquierda a derecha.
// En pantallas chicas los nombres no entran: se muestran solo los puntos y la etapa actual escrita abajo.
export function Progreso({
  estado,
  tipoIngreso,
  enEspera,
  aprobada,
}: {
  estado: Estado;
  tipoIngreso: TipoIngreso;
  enEspera: boolean;
  aprobada: boolean | null;
}) {
  const pasos = recorrido({ estado, tipoIngreso, aprobada });
  const actual = pasos.indexOf(estado);
  const rechazada = aprobada === false || estado === "RECHAZADA";
  const terminada = !rechazada && (estado === "CERRADA" || estado === "CARGADA_EN_PRODUCCION");

  // Color de lo ya recorrido y del punto actual, según cómo viene la solicitud.
  let hecho = "bg-blue-500";
  let puntoActual = "bg-blue-500 ring-4 ring-blue-200";
  if (terminada) {
    hecho = "bg-emerald-500";
    puntoActual = "bg-emerald-500 ring-4 ring-emerald-200";
  } else if (rechazada) {
    hecho = "bg-slate-400";
    puntoActual = "bg-red-500 ring-4 ring-red-200";
  } else if (enEspera) {
    puntoActual = "bg-amber-500 ring-4 ring-amber-200";
  }
  const pendiente = "bg-slate-300";

  const resumen = `Etapa ${actual + 1} de ${pasos.length}: ${nombreEstado(estado)}${enEspera ? " (en espera)" : ""}`;

  return (
    <div>
      <ol className="flex items-start" aria-label={resumen}>
        {pasos.map((p, i) => (
          <li
            key={p}
            aria-current={i === actual ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center"
          >
            <div className="flex h-5 w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : i <= actual ? hecho : pendiente}`} />
              <span
                className={`h-3 w-3 shrink-0 rounded-full ${i === actual ? puntoActual : i < actual ? hecho : pendiente}`}
              />
              <span className={`h-0.5 flex-1 ${i === pasos.length - 1 ? "invisible" : i < actual ? hecho : pendiente}`} />
            </div>
            <span
              className={`mt-1 hidden px-0.5 text-center text-[11px] leading-tight sm:block ${
                i === actual ? "font-bold text-slate-900" : i < actual ? "text-slate-600" : "text-slate-400"
              }`}
            >
              {CORTO[p]}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-slate-600 sm:hidden">
        Etapa {actual + 1} de {pasos.length}: <strong className="text-slate-900">{nombreEstado(estado)}</strong>
        {enEspera && " · en espera"}
      </p>
    </div>
  );
}
