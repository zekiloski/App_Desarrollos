import type { Estado } from "@prisma/client";

// Cálculo puro de tiempos a partir del historial de movimientos. Sin acceso a la base, para poder probarlo.

export type Movimiento = { estadoNuevo: Estado; enEspera: boolean; fecha: Date };

export type TiemposSolicitud = {
  // Milisegundos pasados en cada etapa, sin contar el tiempo en espera.
  porEtapa: Partial<Record<Estado, number>>;
  espera: number;
};

// Cada movimiento abre un tramo que termina en el movimiento siguiente. El tramo pertenece a la etapa
// de ese movimiento, salvo que sea una puesta en espera: ese tiempo se cuenta aparte.
// El tramo en curso (el último, todavía sin cerrar) no se cuenta, para no bajar los promedios.
export function tiemposDeSolicitud(movimientos: Movimiento[]): TiemposSolicitud {
  const t: TiemposSolicitud = { porEtapa: {}, espera: 0 };
  for (let i = 0; i < movimientos.length - 1; i++) {
    const m = movimientos[i];
    const duracion = movimientos[i + 1].fecha.getTime() - m.fecha.getTime();
    if (duracion <= 0) continue;
    if (m.enEspera) t.espera += duracion;
    else t.porEtapa[m.estadoNuevo] = (t.porEtapa[m.estadoNuevo] ?? 0) + duracion;
  }
  return t;
}

export function promedio(valores: number[]) {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}
