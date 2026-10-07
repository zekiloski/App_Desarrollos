import type { Estado, Rol, TipoIngreso, Urgencia } from "@prisma/client";

export const ROLES: Record<Rol, string> = {
  VENDEDOR: "Vendedor",
  RECEPCION: "Encargado / Recepción",
  OFICINA_TECNICA: "Oficina Técnica",
  PRODUCCION: "Encargado de Producción",
  ADMIN: "Gerencia / Admin",
};

export const TIPOS_INGRESO: Record<TipoIngreso, string> = {
  FOTOS: "Solo fotos",
  FISICA: "Pieza física",
  AMBAS: "Fotos y pieza",
};

export const URGENCIAS: Record<Urgencia, string> = {
  BAJA: "Baja",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const COLOR_URGENCIA: Record<Urgencia, string> = {
  BAJA: "bg-slate-100 text-slate-600",
  NORMAL: "bg-slate-100 text-slate-700",
  ALTA: "bg-amber-100 text-amber-800",
  URGENTE: "bg-red-100 text-red-700",
};

// El orden de este listado es el orden del flujo.
export const ESTADOS: { clave: Estado; nombre: string; color: string }[] = [
  { clave: "INGRESADA", nombre: "Ingresada", color: "bg-sky-100 text-sky-800" },
  { clave: "RECIBIDA_EN_PLANTA", nombre: "Pieza recibida en planta", color: "bg-cyan-100 text-cyan-800" },
  { clave: "EN_ANALISIS", nombre: "En análisis técnico", color: "bg-indigo-100 text-indigo-800" },
  { clave: "MEDICIONES_PLANO", nombre: "Mediciones y plano", color: "bg-violet-100 text-violet-800" },
  { clave: "DEFINICION_PROCESOS", nombre: "Definición de procesos", color: "bg-purple-100 text-purple-800" },
  { clave: "EVALUACION_MATRIZ", nombre: "Evaluación de matriz", color: "bg-fuchsia-100 text-fuchsia-800" },
  { clave: "APROBADA", nombre: "Aprobada", color: "bg-emerald-100 text-emerald-800" },
  { clave: "RECHAZADA", nombre: "Rechazada", color: "bg-red-100 text-red-700" },
  { clave: "CODIGO_CREADO", nombre: "Código creado", color: "bg-teal-100 text-teal-800" },
  { clave: "CARGADA_EN_PRODUCCION", nombre: "Cargada en producción", color: "bg-green-100 text-green-800" },
  { clave: "CERRADA", nombre: "Cerrada / Devuelta", color: "bg-slate-200 text-slate-700" },
];

// Texto del botón que lleva la solicitud a cada estado.
export const ACCION_ESTADO: Record<Estado, string> = {
  INGRESADA: "Volver a Ingresada",
  RECIBIDA_EN_PLANTA: "Registrar pieza recibida",
  EN_ANALISIS: "Pasar a análisis técnico",
  MEDICIONES_PLANO: "Pasar a mediciones y plano",
  DEFINICION_PROCESOS: "Pasar a definición de procesos",
  EVALUACION_MATRIZ: "Pasar a evaluación de matriz",
  APROBADA: "Aprobar",
  RECHAZADA: "Rechazar",
  CODIGO_CREADO: "Cargar código de pieza",
  CARGADA_EN_PRODUCCION: "Marcar como cargada en producción",
  CERRADA: "Cerrar / devolver al cliente",
};

const POR_CLAVE =new Map(ESTADOS.map((e) => [e.clave, e]));

export function nombreEstado(estado: Estado) {
  return POR_CLAVE.get(estado)?.nombre ?? estado;
}

export function colorEstado(estado: Estado) {
  return POR_CLAVE.get(estado)?.color ?? "bg-slate-100 text-slate-700";
}
