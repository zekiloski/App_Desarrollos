import type { Estado, Prisma, RequiereMatriz } from "@prisma/client";
import { ESTADOS } from "./etiquetas";
import { fechaCorteDetenidas } from "./config";

// Filtros del listado. Los comparten la pantalla y la exportación a Excel, para que exporte lo mismo que se ve.

export type Filtros = {
  q: string;
  estado?: Estado;
  vendedor?: number;
  cliente: string;
  material: string;
  matriz?: RequiereMatriz;
  desde: string;
  hasta: string;
  detenidas: boolean;
};

type Parametros = Record<string, string | string[] | undefined>;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
// Las fechas del filtro se interpretan en hora de Argentina.
const HUSO = "-03:00";

export function leerFiltros(sp: Parametros): Filtros {
  const txt = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v ?? "").trim().slice(0, 150);
  };
  const vendedor = Number(txt("vendedor"));
  const matriz = txt("matriz");
  return {
    q: txt("q"),
    estado: ESTADOS.find((e) => e.clave === txt("estado"))?.clave,
    vendedor: Number.isInteger(vendedor) && vendedor > 0 ? vendedor : undefined,
    cliente: txt("cliente"),
    material: txt("material"),
    matriz: matriz === "SI" || matriz === "NO" || matriz === "SIN_EVALUAR" ? matriz : undefined,
    desde: FECHA.test(txt("desde")) ? txt("desde") : "",
    hasta: FECHA.test(txt("hasta")) ? txt("hasta") : "",
    detenidas: txt("detenidas") === "1",
  };
}

export function condicionesDeFiltros(f: Filtros, diasAlerta: number): Prisma.SolicitudWhereInput[] {
  const c: Prisma.SolicitudWhereInput[] = [];
  if (f.q) {
    c.push({
      OR: [
        { numero: { contains: f.q } },
        { descripcion: { contains: f.q } },
        { implemento: { contains: f.q } },
        { codigoPieza: { contains: f.q } },
        { cliente: { nombre: { contains: f.q } } },
        { vendedor: { nombre: { contains: f.q } } },
      ],
    });
  }
  if (f.estado) c.push({ estado: f.estado });
  if (f.vendedor) c.push({ vendedorId: f.vendedor });
  if (f.cliente) c.push({ cliente: { nombre: { contains: f.cliente } } });
  if (f.material) c.push({ material: { contains: f.material } });
  if (f.matriz) c.push({ requiereMatriz: f.matriz });
  if (f.desde) c.push({ fechaIngreso: { gte: new Date(`${f.desde}T00:00:00${HUSO}`) } });
  if (f.hasta) c.push({ fechaIngreso: { lte: new Date(`${f.hasta}T23:59:59.999${HUSO}`) } });
  if (f.detenidas) c.push(condicionDetenidas(diasAlerta));
  return c;
}

// Detenida: sigue abierta y no tuvo cambios de etapa en los últimos N días.
export function condicionDetenidas(diasAlerta: number): Prisma.SolicitudWhereInput {
  return { estado: { not: "CERRADA" }, fechaUltimoMovimiento: { lte: fechaCorteDetenidas(diasAlerta) } };
}

export function hayFiltrosAvanzados(f: Filtros) {
  return !!(f.vendedor || f.cliente || f.material || f.matriz || f.desde || f.hasta || f.detenidas);
}

export function hayFiltros(f: Filtros) {
  return !!(f.q || f.estado) || hayFiltrosAvanzados(f);
}

export function filtrosAQuery(f: Filtros) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (v === true) p.set(k, "1");
    else if (v) p.set(k, String(v));
  }
  return p.toString();
}
