import { cache } from "react";
import type { Rol } from "@prisma/client";
import { db } from "./db";
import {
  PERMISOS_POR_DEFECTO,
  ROLES_CONFIGURABLES,
  establecerPermisos,
  type Accion,
  type MatrizPermisos,
} from "./permisos";

// Cada permiso modificado se guarda como una fila de Configuracion: clave "permiso:<accion>", valor = roles
// separados por coma. Lo que no tiene fila usa el valor de fábrica.
export const PREFIJO_PERMISO = "permiso:";

export const esAccionConfigurable = (a: string): a is Accion => a in PERMISOS_POR_DEFECTO && a !== "admin";

// Lee los permisos vigentes y los deja disponibles para puede(). Una sola consulta por pedido.
export const cargarPermisos = cache(async (): Promise<MatrizPermisos> => {
  const filas = await db.configuracion.findMany({ where: { clave: { startsWith: PREFIJO_PERMISO } } });
  const matriz: MatrizPermisos = { ...PERMISOS_POR_DEFECTO };
  for (const f of filas) {
    const accion = f.clave.slice(PREFIJO_PERMISO.length);
    if (!esAccionConfigurable(accion)) continue;
    const roles = f.valor.split(",").filter((r): r is Rol => (ROLES_CONFIGURABLES as string[]).includes(r));
    matriz[accion] = [...roles, "ADMIN"];
  }
  establecerPermisos(matriz);
  return matriz;
});
