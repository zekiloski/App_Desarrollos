import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { diasAlerta } from "@/lib/config";
import {
  condicionDetenidas,
  condicionesDeFiltros,
  filtrosAQuery,
  hayFiltros,
  hayFiltrosAvanzados,
  leerFiltros,
} from "@/lib/filtros";
import { COLOR_URGENCIA, ESTADOS, URGENCIAS, colorEstado, nombreEstado } from "@/lib/etiquetas";
import { diasDesde, fecha, hace } from "@/lib/formato";

export const metadata: Metadata = { title: "Solicitudes" };

const LIMITE = 100;

export default async function PaginaSolicitudes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const u = await requerirUsuario();
  const f = leerFiltros(await searchParams);
  const veTodas = puede(u.rol, "solicitud.verTodas");
  const dias = await diasAlerta();
  const visibilidad = filtroVisibilidad(u);

  const [solicitudes, detenidas, vendedores] = await Promise.all([
    db.solicitud.findMany({
      where: { AND: [visibilidad, ...condicionesDeFiltros(f, dias)] },
      orderBy: { fechaIngreso: "desc" },
      take: LIMITE + 1,
      include: {
        cliente: { select: { nombre: true } },
        vendedor: { select: { nombre: true } },
        fotos: { select: { rutaMiniatura: true }, orderBy: { id: "asc" }, take: 1 },
      },
    }),
    db.solicitud.count({ where: { AND: [visibilidad, condicionDetenidas(dias)] } }),
    veTodas
      ? db.usuario.findMany({
          where: { solicitudesVendidas: { some: {} } },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true },
        })
      : [],
  ]);

  const hayMas = solicitudes.length > LIMITE;
  const visibles = solicitudes.slice(0, LIMITE);
  const query = filtrosAQuery(f);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{veTodas ? "Solicitudes" : "Mis solicitudes"}</h1>
        {puede(u.rol, "solicitud.crear") && (
          <Link href="/solicitudes/nueva" className="btn btn-primario hidden sm:inline-flex">
            + Nueva solicitud
          </Link>
        )}
      </div>

      {detenidas > 0 && !f.detenidas && (
        <Link
          href="/solicitudes?detenidas=1"
          className="block rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
        >
          <strong>
            {detenidas === 1 ? "1 solicitud lleva" : `${detenidas} solicitudes llevan`} más de {dias} días sin
            movimiento.
          </strong>{" "}
          <span className="underline">Ver cuáles</span>
        </Link>
      )}

      <form className="space-y-2" role="search">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={f.q}
            placeholder="Buscar por N°, cliente, descripción, código…"
            className="campo sm:flex-1"
            aria-label="Buscar"
          />
          <select name="estado" defaultValue={f.estado ?? ""} className="campo sm:w-64" aria-label="Estado">
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e.clave} value={e.clave}>
                {e.nombre}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primario">
            Filtrar
          </button>
        </div>

        <details open={hayFiltrosAvanzados(f)} className="rounded-xl border border-slate-200 bg-superficie">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Más filtros</summary>
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {veTodas && (
              <div>
                <label htmlFor="f-vendedor" className="etiqueta">
                  Vendedor
                </label>
                <select id="f-vendedor" name="vendedor" defaultValue={f.vendedor ?? ""} className="campo">
                  <option value="">Todos</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="f-cliente" className="etiqueta">
                Cliente
              </label>
              <input id="f-cliente" name="cliente" defaultValue={f.cliente} className="campo" />
            </div>
            <div>
              <label htmlFor="f-material" className="etiqueta">
                Material
              </label>
              <input id="f-material" name="material" defaultValue={f.material} className="campo" />
            </div>
            <div>
              <label htmlFor="f-matriz" className="etiqueta">
                ¿Requiere matriz?
              </label>
              <select id="f-matriz" name="matriz" defaultValue={f.matriz ?? ""} className="campo">
                <option value="">Todas</option>
                <option value="SI">Sí</option>
                <option value="NO">No</option>
                <option value="SIN_EVALUAR">Sin evaluar</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-desde" className="etiqueta">
                Ingresó desde
              </label>
              <input id="f-desde" name="desde" type="date" defaultValue={f.desde} className="campo" />
            </div>
            <div>
              <label htmlFor="f-hasta" className="etiqueta">
                Ingresó hasta
              </label>
              <input id="f-hasta" name="hasta" type="date" defaultValue={f.hasta} className="campo" />
            </div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 sm:col-span-2 lg:col-span-3">
              <input type="checkbox" name="detenidas" value="1" defaultChecked={f.detenidas} className="h-6 w-6" />
              <span className="font-semibold">Solo detenidas</span>
              <span className="text-sm text-slate-500">(más de {dias} días sin movimiento)</span>
            </label>
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {hayFiltros(f) && (
            <Link href="/solicitudes" className="font-semibold text-blue-700 underline">
              Quitar filtros
            </Link>
          )}
          {visibles.length > 0 && (
            <a href={`/api/solicitudes/exportar${query ? `?${query}` : ""}`} className="font-semibold text-blue-700 underline">
              Exportar a Excel
            </a>
          )}
          <span className="text-slate-500">
            {hayMas ? `Más de ${LIMITE} resultados` : visibles.length === 1 ? "1 resultado" : `${visibles.length} resultados`}
          </span>
        </div>
      </form>

      {visibles.length === 0 ? (
        <div className="tarjeta py-10 text-center text-slate-500">
          {hayFiltros(f) ? "No hay solicitudes que coincidan con los filtros." : "Todavía no hay solicitudes cargadas."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((s) => {
            const sinMovimiento = diasDesde(s.fechaUltimoMovimiento);
            const detenida = s.estado !== "CERRADA" && sinMovimiento >= dias;
            return (
              <li key={s.id}>
                <Link
                  href={`/solicitudes/${s.id}`}
                  className="tarjeta flex gap-3 transition hover:border-blue-300 hover:shadow"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {s.fotos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/archivos/${s.fotos[0].rutaMiniatura}`}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        Sin foto
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono text-sm font-bold text-blue-800">{s.numero}</span>
                      <span className={`chip ${colorEstado(s.estado)}`}>{nombreEstado(s.estado)}</span>
                      {s.enEspera && <span className="chip bg-amber-100 text-amber-800">En espera</span>}
                      {detenida && (
                        <span className="chip bg-red-100 text-red-700">Detenida {sinMovimiento} días</span>
                      )}
                      {(s.urgencia === "ALTA" || s.urgencia === "URGENTE") && (
                        <span className={`chip ${COLOR_URGENCIA[s.urgencia]}`}>{URGENCIAS[s.urgencia]}</span>
                      )}
                    </div>
                    <div className="mt-1 truncate font-semibold">{s.cliente.nombre}</div>
                    <p className="line-clamp-2 text-sm text-slate-600">{s.descripcion}</p>
                    <div className="mt-1 text-xs text-slate-500">
                      {s.vendedor.nombre} · {fecha(s.fechaIngreso)} ({hace(s.fechaIngreso)})
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hayMas && (
        <p className="text-center text-sm text-slate-500">
          Se muestran las {LIMITE} más recientes. Afiná los filtros para ver el resto, o exportá a Excel para
          tenerlas todas.
        </p>
      )}
    </div>
  );
}
