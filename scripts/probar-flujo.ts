// Verifica las reglas del flujo de estados. Uso: npx tsx scripts/probar-flujo.ts
import type { Estado, Rol, TipoIngreso } from "@prisma/client";
import { avancesPosibles, evaluarCambio, retrocesosPosibles, type SolicitudFlujo } from "../src/lib/estados";

let fallas = 0;
function esperar(nombre: string, obtenido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallas++;
  console.log(ok ? "ok   " : "FALLA", nombre, ok ? "" : `-> ${JSON.stringify(obtenido)} (esperado ${JSON.stringify(esperado)})`);
}

const sol = (estado: Estado, tipoIngreso: TipoIngreso = "AMBAS", extra: Partial<SolicitudFlujo> = {}): SolicitudFlujo => ({
  estado,
  tipoIngreso,
  enEspera: false,
  aprobada: null,
  codigoPieza: null,
  requiereMatriz: "NO",
  etiquetaQr: "PENDIENTE",
  ...extra,
});
const resultado = (s: SolicitudFlujo, rol: Rol, d: Estado) => {
  const e = evaluarCambio(s, rol, d);
  return e.ok ? `${e.tipo}:${e.requisitos.join(",")}` : "no";
};

esperar("solo fotos saltea la recepción", avancesPosibles(sol("INGRESADA", "FOTOS"), "ADMIN"), ["EN_ANALISIS"]);
esperar("pieza física debe recibirse primero", avancesPosibles(sol("INGRESADA", "FISICA"), "ADMIN"), ["RECIBIDA_EN_PLANTA"]);
esperar("ambas: recibir o analizar", avancesPosibles(sol("INGRESADA"), "ADMIN"), ["RECIBIDA_EN_PLANTA", "EN_ANALISIS"]);
esperar("recepción solo puede recibir", avancesPosibles(sol("INGRESADA"), "RECEPCION"), ["RECIBIDA_EN_PLANTA"]);
esperar("vendedor no mueve nada", avancesPosibles(sol("INGRESADA"), "VENDEDOR"), []);
esperar("recibir pide ubicación y etiqueta", resultado(sol("INGRESADA"), "RECEPCION", "RECIBIDA_EN_PLANTA"), "avance:ubicacion,etiqueta");
esperar("a análisis con etiqueta pendiente: la pide", resultado(sol("RECIBIDA_EN_PLANTA"), "ADMIN", "EN_ANALISIS"), "avance:etiqueta");
esperar("a análisis con etiqueta generada: no la pide", resultado(sol("RECIBIDA_EN_PLANTA", "AMBAS", { etiquetaQr: "IMPRESA" }), "ADMIN", "EN_ANALISIS"), "avance:");
esperar("a análisis con 'no hace falta': no la pide", resultado(sol("RECIBIDA_EN_PLANTA", "AMBAS", { etiquetaQr: "NO_REQUIERE" }), "ADMIN", "EN_ANALISIS"), "avance:");
esperar("solo fotos a análisis: no pide etiqueta", resultado(sol("INGRESADA", "FOTOS"), "ADMIN", "EN_ANALISIS"), "avance:");
esperar("producción aprueba", resultado(sol("EVALUACION_MATRIZ"), "PRODUCCION", "APROBADA"), "avance:");
esperar(
  "no se aprueba sin evaluar la matriz",
  resultado(sol("EVALUACION_MATRIZ", "AMBAS", { requiereMatriz: "SIN_EVALUAR" }), "ADMIN", "APROBADA"),
  "no",
);
esperar("sin evaluar la matriz igual se puede rechazar", resultado(sol("EVALUACION_MATRIZ", "AMBAS", { requiereMatriz: "SIN_EVALUAR" }), "ADMIN", "RECHAZADA"), "avance:motivo");
esperar("rechazar pide motivo",resultado(sol("EVALUACION_MATRIZ"), "PRODUCCION", "RECHAZADA"), "avance:motivo");
esperar("se puede rechazar en análisis", resultado(sol("EN_ANALISIS"), "OFICINA_TECNICA", "RECHAZADA"), "avance:motivo");
esperar("no se aprueba antes de evaluar matriz", resultado(sol("EN_ANALISIS"), "ADMIN", "APROBADA"), "no");
esperar("recepción no aprueba", resultado(sol("EVALUACION_MATRIZ"), "RECEPCION", "APROBADA"), "no");
esperar("código lo carga Oficina Técnica", resultado(sol("APROBADA"), "OFICINA_TECNICA", "CODIGO_CREADO"), "avance:codigo");
esperar("producción no carga código", resultado(sol("APROBADA"), "PRODUCCION", "CODIGO_CREADO"), "no");
esperar("con código ya cargado no lo vuelve a pedir", resultado(sol("APROBADA", "AMBAS", { codigoPieza: "X1" }), "ADMIN", "CODIGO_CREADO"), "avance:");
esperar("no se saltean etapas", resultado(sol("EN_ANALISIS"), "ADMIN", "EVALUACION_MATRIZ"), "no");
esperar("rechazada solo se cierra", avancesPosibles(sol("RECHAZADA", "AMBAS", { aprobada: false }), "ADMIN"), ["CERRADA"]);
esperar("retroceso pide motivo", resultado(sol("DEFINICION_PROCESOS"), "OFICINA_TECNICA", "MEDICIONES_PLANO"), "retroceso:motivo");
esperar("producción no retrocede", resultado(sol("DEFINICION_PROCESOS"), "PRODUCCION", "MEDICIONES_PLANO"), "no");
esperar(
  "rechazada no vuelve a etapas de aprobada",
  retrocesosPosibles(sol("CERRADA", "FOTOS", { aprobada: false }), "ADMIN"),
  ["INGRESADA", "EN_ANALISIS", "MEDICIONES_PLANO", "DEFINICION_PROCESOS", "EVALUACION_MATRIZ"],
);
esperar("en espera no se mueve", resultado(sol("EN_ANALISIS", "AMBAS", { enEspera: true }), "ADMIN", "MEDICIONES_PLANO"), "no");
esperar("cerrada no avanza", avancesPosibles(sol("CERRADA"), "ADMIN"), []);

console.log(fallas ? `\n${fallas} FALLAS` : "\nTodas las reglas OK");
process.exit(fallas ? 1 : 0);
