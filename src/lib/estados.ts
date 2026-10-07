import type { Estado, RequiereMatriz, Rol, TipoIngreso } from "@prisma/client";
import { puede, type Accion } from "./permisos";

// Reglas del flujo. No depende del servidor: lo usan las acciones, la ficha y el tablero.

export type SolicitudFlujo = {
  estado: Estado;
  tipoIngreso: TipoIngreso;
  enEspera: boolean;
  aprobada: boolean | null;
  codigoPieza: string | null;
  requiereMatriz: RequiereMatriz;
};

export type Requisito = "motivo" | "ubicacion" | "codigo";

export type Evaluacion =
  | { ok: true; tipo: "avance" | "retroceso"; requisitos: Requisito[] }
  | { ok: false; error: string };

const ORDEN: Estado[] = [
  "INGRESADA",
  "RECIBIDA_EN_PLANTA",
  "EN_ANALISIS",
  "MEDICIONES_PLANO",
  "DEFINICION_PROCESOS",
  "EVALUACION_MATRIZ",
  "APROBADA",
  "RECHAZADA",
  "CODIGO_CREADO",
  "CARGADA_EN_PRODUCCION",
  "CERRADA",
];

// Se puede rechazar desde cualquier etapa técnica, pero aprobar solo al final de la evaluación.
const AVANCES: Record<Estado, Estado[]> = {
  INGRESADA: ["RECIBIDA_EN_PLANTA", "EN_ANALISIS"],
  RECIBIDA_EN_PLANTA: ["EN_ANALISIS"],
  EN_ANALISIS: ["MEDICIONES_PLANO", "RECHAZADA"],
  MEDICIONES_PLANO: ["DEFINICION_PROCESOS", "RECHAZADA"],
  DEFINICION_PROCESOS: ["EVALUACION_MATRIZ", "RECHAZADA"],
  EVALUACION_MATRIZ: ["APROBADA", "RECHAZADA"],
  APROBADA: ["CODIGO_CREADO"],
  RECHAZADA: ["CERRADA"],
  CODIGO_CREADO: ["CARGADA_EN_PRODUCCION"],
  CARGADA_EN_PRODUCCION: ["CERRADA"],
  CERRADA: [],
};

// Permiso necesario para llevar una solicitud a cada estado.
const PERMISO_DESTINO: Record<Estado, Accion> = {
  INGRESADA: "estado.retroceder",
  RECIBIDA_EN_PLANTA: "ubicacion.editar",
  EN_ANALISIS: "tecnico.editar",
  MEDICIONES_PLANO: "tecnico.editar",
  DEFINICION_PROCESOS: "tecnico.editar",
  EVALUACION_MATRIZ: "tecnico.editar",
  APROBADA: "solicitud.aprobar",
  RECHAZADA: "solicitud.aprobar",
  CODIGO_CREADO: "codigo.gestionar",
  CARGADA_EN_PRODUCCION: "codigo.gestionar",
  CERRADA: "solicitud.cerrar",
};

export function indiceEstado(e: Estado) {
  return ORDEN.indexOf(e);
}

function avancesDelFlujo(s: SolicitudFlujo): Estado[] {
  if (s.estado !== "INGRESADA") return AVANCES[s.estado];
  // Solo fotos: no hay pieza que recibir. Pieza física: primero tiene que llegar a planta.
  if (s.tipoIngreso === "FOTOS") return ["EN_ANALISIS"];
  if (s.tipoIngreso === "FISICA") return ["RECIBIDA_EN_PLANTA"];
  return AVANCES.INGRESADA;
}

function retrocesosDelFlujo(s: SolicitudFlujo): Estado[] {
  const excluidos: Estado[] = ["RECHAZADA"];
  if (s.tipoIngreso === "FOTOS") excluidos.push("RECIBIDA_EN_PLANTA");
  if (s.aprobada === false) excluidos.push("APROBADA", "CODIGO_CREADO", "CARGADA_EN_PRODUCCION");
  return ORDEN.slice(0, indiceEstado(s.estado)).filter((e) => !excluidos.includes(e));
}

export function avancesPosibles(s: SolicitudFlujo, rol: Rol): Estado[] {
  if (s.enEspera) return [];
  return avancesDelFlujo(s).filter((e) => puede(rol, PERMISO_DESTINO[e]));
}

export function retrocesosPosibles(s: SolicitudFlujo, rol: Rol): Estado[] {
  if (s.enEspera || !puede(rol, "estado.retroceder")) return [];
  return retrocesosDelFlujo(s);
}

export function evaluarCambio(s: SolicitudFlujo, rol: Rol, destino: Estado): Evaluacion {
  if (destino === s.estado) return { ok: false, error: "La solicitud ya está en esa etapa." };
  if (s.enEspera) return { ok: false, error: "La solicitud está en espera: retomala antes de cambiarla de etapa." };

  if (avancesDelFlujo(s).includes(destino)) {
    if (!puede(rol, PERMISO_DESTINO[destino])) {
      return { ok: false, error: "Tu rol no puede pasar la solicitud a esa etapa." };
    }
    if (destino === "APROBADA" && s.requiereMatriz === "SIN_EVALUAR") {
      return {
        ok: false,
        error: "Antes de aprobar, indicá en Datos técnicos si la pieza requiere matriz.",
      };
    }
    const requisitos: Requisito[] = [];
    if (destino === "RECIBIDA_EN_PLANTA") requisitos.push("ubicacion");
    if (destino === "RECHAZADA") requisitos.push("motivo");
    if (destino === "CODIGO_CREADO" && !s.codigoPieza) requisitos.push("codigo");
    return { ok: true, tipo: "avance", requisitos };
  }

  if (retrocesosDelFlujo(s).includes(destino)) {
    if (!puede(rol, "estado.retroceder")) {
      return { ok: false, error: "Solo Oficina Técnica o Gerencia pueden volver una solicitud a una etapa anterior." };
    }
    return { ok: true, tipo: "retroceso", requisitos: ["motivo"] };
  }

  return { ok: false, error: "No se puede pasar directo a esa etapa: hay que seguir el orden del flujo." };
}

export function puedePonerEnEspera(s: SolicitudFlujo, rol: Rol) {
  return s.estado !== "CERRADA" && puede(rol, "solicitud.espera");
}
