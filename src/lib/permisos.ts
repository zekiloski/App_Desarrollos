import type { Rol } from "@prisma/client";

export type Accion =
  | "solicitud.crear"
  | "solicitud.verTodas"
  | "ubicacion.editar"
  | "tecnico.editar"
  | "solicitud.aprobar"
  | "codigo.gestionar"
  | "solicitud.espera"
  | "solicitud.cerrar"
  | "estado.retroceder"
  | "procesos.catalogo"
  | "comentar"
  | "admin";

const PERMISOS: Record<Accion, Rol[]> = {
  "solicitud.crear": ["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "ADMIN"],
  // Solo el vendedor queda limitado a las suyas: Recepción recibe piezas de cualquier solicitud
  // y Producción participa del análisis y la aprobación.
  "solicitud.verTodas": ["RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "ubicacion.editar": ["RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "tecnico.editar": ["OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "solicitud.aprobar": ["OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "codigo.gestionar": ["OFICINA_TECNICA", "ADMIN"],
  "solicitud.espera": ["RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "solicitud.cerrar": ["RECEPCION", "OFICINA_TECNICA", "ADMIN"],
  "estado.retroceder": ["OFICINA_TECNICA", "ADMIN"],
  "procesos.catalogo": ["OFICINA_TECNICA", "ADMIN"],
  comentar: ["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  admin: ["ADMIN"],
};

export function puede(rol: Rol, accion: Accion) {
  return PERMISOS[accion].includes(rol);
}
