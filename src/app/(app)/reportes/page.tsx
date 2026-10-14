import type { Metadata } from "next";
import Link from "next/link";
import { requerirPermiso } from "@/lib/auth";
import { TIPOS_INGRESO, colorEstado, nombreEstado } from "@/lib/etiquetas";
import { duracion, fecha, fechaHora } from "@/lib/formato";
import {
  MAX_FILAS_REPORTE,
  filtrosReporteAQuery,
  generarReporte,
  leerFiltrosReporte,
  type Situacion,
} from "@/lib/reportes";
import { BotonImprimir } from "./BotonImprimir";

export const metadata: Metadata = { title: "Reportes" };

const SITUACION: Record<Situacion, string> = {
  todas: "Todas",
  en_curso: "En curso",
  en_produccion: "Cargadas en el sistema productivo",
  rechazadas: "Rechazadas",
};

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="tarjeta">
      <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{titulo}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{valor}</div>
      {detalle && <div className="mt-0.5 text-xs text-slate-500">{detalle}</div>}
    </div>
  );
}

export default async function PaginaReportes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const u = await requerirPermiso("reportes.ver");
  const f = leerFiltrosReporte(await searchParams);
  const filas = await generarReporte(u, f);

  const enProduccion = filas.filter((x) => x.produccionEl);
  const promedio = enProduccion.length
    ? enProduccion.reduce((t, x) => t + x.demoraMs, 0) / enProduccion.length
    : null;
  const query = filtrosReporteAQuery(f);

  const periodo =
    f.desde || f.hasta
      ? `Ingresadas ${f.desde ? `desde el ${fecha(new Date(`${f.desde}T12:00:00-03:00`))}` : ""}${
          f.hasta ? ` hasta el ${fecha(new Date(`${f.hasta}T12:00:00-03:00`))}` : ""
        }`
      : "Todas las fechas";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reporte de nuevos desarrollos</h1>
          <p className="text-sm text-slate-500">
            {periodo} · {SITUACION[f.situacion]}
            <span className="hidden print:inline"> · Generado el {fechaHora(new Date())} por {u.nombre}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <BotonImprimir />
          <a href={`/api/reportes/excel${query ? `?${query}` : ""}`} className="btn btn-primario">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
            </svg>
            Exportar a Excel
          </a>
        </div>
      </div>

      <form className="tarjeta grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end print:hidden">
        <div>
          <label htmlFor="desde" className="etiqueta">
            Ingresadas desde
          </label>
          <input id="desde" name="desde" type="date" defaultValue={f.desde} className="campo" />
        </div>
        <div>
          <label htmlFor="hasta" className="etiqueta">
            Hasta
          </label>
          <input id="hasta" name="hasta" type="date" defaultValue={f.hasta} className="campo" />
        </div>
        <div>
          <label htmlFor="situacion" className="etiqueta">
            Situación
          </label>
          <select id="situacion" name="situacion" defaultValue={f.situacion} className="campo">
            {Object.entries(SITUACION).map(([k, nombre]) => (
              <option key={k} value={k}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primario flex-1">
            Ver
          </button>
          {query && (
            <Link href="/reportes" className="btn btn-secundario">
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titulo="Solicitudes" valor={String(filas.length)} detalle={SITUACION[f.situacion]} />
        <Cifra
          titulo="En sistema productivo"
          valor={String(enProduccion.length)}
          detalle="Código cargado en el sistema"
        />
        <Cifra titulo="Con código" valor={String(filas.filter((x) => x.codigo).length)} />
        <Cifra
          titulo="Tiempo promedio"
          valor={promedio === null ? "—" : duracion(promedio)}
          detalle="Desde el ingreso hasta el sistema productivo"
        />
      </div>

      {filas.length === MAX_FILAS_REPORTE && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Se muestran las {MAX_FILAS_REPORTE} más recientes. Acotá las fechas para ver el resto.
        </p>
      )}

      {filas.length === 0 ? (
        <div className="tarjeta py-10 text-center text-slate-500">No hay solicitudes con esos filtros.</div>
      ) : (
        <div className="tarjeta overflow-x-auto p-0! print:overflow-visible">
          <table className="tabla-reporte w-full min-w-[1100px] text-left text-sm print:min-w-0">
            <thead>
              <tr>
                <th>Solicitud</th>
                <th>Ingreso</th>
                <th>Código de pieza</th>
                <th>Sistema productivo</th>
                <th>Tiempo total</th>
                <th>Responsables por etapa</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((x) => (
                <tr key={x.id}>
                  <td>
                    <Link href={`/solicitudes/${x.id}`} className="font-mono font-bold text-blue-700 hover:underline">
                      {x.numero}
                    </Link>
                    <div className="font-semibold">{x.cliente}</div>
                    <div className="line-clamp-2 text-xs text-slate-500">{x.descripcion}</div>
                  </td>
                  <td>
                    <div className="whitespace-nowrap">{fechaHora(x.fechaIngreso)}</div>
                    <div className="text-xs text-slate-500">{TIPOS_INGRESO[x.tipoIngreso]}</div>
                    <div className="text-xs">
                      Cargó: <strong>{x.ingresadaPor}</strong>
                    </div>
                    {x.vendedor !== x.ingresadaPor && <div className="text-xs">Vendedor: {x.vendedor}</div>}
                  </td>
                  <td>
                    {x.codigo ? (
                      <>
                        <div className="font-mono font-bold">{x.codigo}</div>
                        {x.codigoPor && <div className="text-xs">{x.codigoPor}</div>}
                        {x.codigoEl && <div className="text-xs text-slate-500">{fechaHora(x.codigoEl)}</div>}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    {x.produccionEl ? (
                      <>
                        <div className="whitespace-nowrap">{fechaHora(x.produccionEl)}</div>
                        <div className="text-xs">
                          Cargó: <strong>{x.produccionPor}</strong>
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400">Pendiente</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="font-semibold">{duracion(x.demoraMs)}</div>
                    {!x.terminada && <div className="text-xs text-amber-700">en curso</div>}
                  </td>
                  <td>
                    {x.pasos.length ? (
                      <ul className="space-y-0.5 text-xs">
                        {x.pasos.map((p) => (
                          <li key={p.nombre}>
                            <span className="text-slate-500">{p.nombre}:</span> <strong>{p.usuario}</strong>{" "}
                            <span className="text-slate-400">{fecha(p.fecha)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`chip ${colorEstado(x.estado)}`}>{nombreEstado(x.estado)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
