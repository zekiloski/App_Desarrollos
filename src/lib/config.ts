import { db } from "./db";

export const CLAVE_DIAS_ALERTA = "dias_alerta_sin_movimiento";
const DIAS_ALERTA_POR_DEFECTO = 7;

// Días sin movimiento a partir de los cuales una solicitud abierta se considera detenida.
export async function diasAlerta() {
  const c = await db.configuracion.findUnique({ where: { clave: CLAVE_DIAS_ALERTA } });
  const n = Number(c?.valor);
  return Number.isInteger(n) && n > 0 ? n : DIAS_ALERTA_POR_DEFECTO;
}

export function fechaCorteDetenidas(dias: number) {
  return new Date(Date.now() - dias * 86_400_000);
}
