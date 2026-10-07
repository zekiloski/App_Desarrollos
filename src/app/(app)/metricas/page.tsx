import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requerirPermiso } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { diasAlerta } from "@/lib/config";
import { condicionDetenidas } from "@/lib/filtros";
import { calcularMetricas, type Conteo } from "@/lib/metricas";
import { colorEstado, nombreEstado } from "@/lib/etiquetas";
import { diasDesde, duracion } from "@/lib/formato";
import { FormDiasAlerta } from "./FormDiasAlerta";

export const metadata: Metadata = { title: "Métricas" };

const PERIODOS: Record<string, { nombre: string; dias: number | null }> = {
  "30": { nombre: "Últimos 30 días", dias: 30 },
  "90": { nombre: "Últimos 90 días", dias: 90 },
  "365": { nombre: "Último año", dias: 365 },
  todo: { nombre: "Todo el historial", dias: null },
};

const MAX_DETENIDAS = 50;

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="tarjeta">
      <div className="text-sm font-semibold text-slate-500">{titulo}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-slate-500">{detalle}</div>}
    </div>
  );
}

// Barras horizontales de una sola serie: el largo muestra la magnitud y el valor va siempre escrito al lado.
function Barras({ filas, vacio }: { filas: { nombre: string; valor: number; texto: string; detalle?: string }[]; vacio: string }) {
  if (filas.length === 0) return <p className="text-sm text-slate-500">{vacio}</p>;
  const maximo = Math.max(...filas.map((f) => f.valor));
  return (
    <ul className="space-y-3">
      {filas.map((f) => (
        <li key={f.nombre}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{f.nombre}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {f.texto}
              {f.detalle && <span className="ml-1 font-normal text-slate-500">{f.detalle}</span>}
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded-r bg-slate-200">
            <div
              className="h-full min-w-0.5 rounded-r bg-blue-500"
              style={{ width: `${maximo > 0 ? (f.valor / maximo) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const aBarras = (conteos: Conteo[]) =>
  conteos.map((c) => ({ nombre: c.nombre, valor: c.cantidad, texto: String(c.cantidad) }));

const promedioTexto = (p: { promedioMs: number | null; solicitudes: number }) =>
  p.promedioMs === null ? "—" : duracion(p.promedioMs);
const baseTexto = (n: number, que: string) =>
  n === 0 ? "Todavía sin datos" : `Promedio de ${n} ${n === 1 ? "solicitud" : "solicitudes"} ${que}`;

export default async function PaginaMetricas({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const u = await requerirPermiso("metricas.ver");
  const clave = (await searchParams).periodo ?? "todo";
  const periodo = PERIODOS[clave] ?? PERIODOS.todo;
  const desde = periodo.dias ? new Date(Date.now() - periodo.dias * 86_400_000) : null;

  const dias = await diasAlerta();
  const [m, detenidas, totalDetenidas] = await Promise.all([
    calcularMetricas(desde),
    db.solicitud.findMany({
      where: condicionDetenidas(dias),
      orderBy: { fechaUltimoMovimiento: "asc" },
      take: MAX_DETENIDAS,
      select: {
        id: true,
        numero: true,
        estado: true,
        enEspera: true,
        fechaUltimoMovimiento: true,
        cliente: { select: { nombre: true } },
        vendedor: { select: { nombre: true } },
      },
    }),
    db.solicitud.count({ where: condicionDetenidas(dias) }),
  ]);

  const resueltas = m.aprobadas + m.rechazadas;
  const pctAprobadas = resueltas ? Math.round((m.aprobadas / resueltas) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="text-sm text-slate-500">Solicitudes ingresadas en el período elegido.</p>
        </div>
        <form className="flex items-end gap-2">
          <div>
            <label htmlFor="periodo" className="etiqueta">
              Período
            </label>
            <select id="periodo" name="periodo" defaultValue={PERIODOS[clave] ? clave : "todo"} className="campo">
              {Object.entries(PERIODOS).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-secundario">
            Ver
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra titulo="Solicitudes ingresadas" valor={String(m.total)} detalle={periodo.nombre} />
        <Cifra titulo="Abiertas" valor={String(m.abiertas)} detalle={`${m.total - m.abiertas} cerradas`} />
        <Cifra titulo="En espera" valor={String(m.enEspera)} />
        <Cifra titulo="Detenidas ahora" valor={String(totalDetenidas)} detalle={`Más de ${dias} días sin movimiento`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Cifra
          titulo="Tiempo total de desarrollo"
          valor={promedioTexto(m.hastaProduccion)}
          detalle={baseTexto(m.hastaProduccion.solicitudes, "desde el ingreso hasta cargarse en producción")}
        />
        <Cifra
          titulo="Tiempo hasta aprobar o rechazar"
          valor={promedioTexto(m.hastaResolucion)}
          detalle={baseTexto(m.hastaResolucion.solicitudes, "desde el ingreso hasta la decisión")}
        />
        <Cifra
          titulo="Tiempo en espera"
          valor={promedioTexto(m.espera)}
          detalle={baseTexto(m.espera.solicitudes, "que estuvieron en espera")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="titulo-seccion">Tiempo promedio por etapa</h2>
          <Barras
            vacio="Todavía ninguna solicitud completó una etapa."
            filas={m.etapas.map((e) => ({
              nombre: e.nombre,
              valor: e.promedioMs,
              texto: duracion(e.promedioMs),
              detalle: `(${e.solicitudes})`,
            }))}
          />
          <p className="mt-3 text-xs text-slate-500">
            Etapas ya completadas, sin contar el tiempo en espera. Entre paréntesis, cuántas solicitudes pasaron
            por cada una.
          </p>
        </section>

        <section className="tarjeta">
          <h2 className="titulo-seccion">Aprobación y rechazo</h2>
          {resueltas === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay solicitudes aprobadas ni rechazadas.</p>
          ) : (
            <>
              <div className="text-3xl font-bold tabular-nums">{pctAprobadas}%</div>
              <div className="text-sm text-slate-500">
                de aprobación sobre {resueltas} {resueltas === 1 ? "solicitud resuelta" : "solicitudes resueltas"}
              </div>
              <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded">
                {m.aprobadas > 0 && <div className="bg-emerald-500" style={{ flexGrow: m.aprobadas }} />}
                {m.rechazadas > 0 && <div className="bg-red-500" style={{ flexGrow: m.rechazadas }} />}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm bg-emerald-500" aria-hidden="true" />
                  <dt>Aprobadas</dt>
                  <dd className="ml-auto font-semibold tabular-nums">
                    {m.aprobadas} ({pctAprobadas}%)
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-sm bg-red-500" aria-hidden="true" />
                  <dt>Rechazadas</dt>
                  <dd className="ml-auto font-semibold tabular-nums">
                    {m.rechazadas} ({100 - pctAprobadas}%)
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>

        <section className="tarjeta">
          <h2 className="titulo-seccion">Solicitudes por vendedor</h2>
          <Barras vacio="Sin solicitudes en el período." filas={aBarras(m.porVendedor)} />
        </section>

        <section className="tarjeta">
          <h2 className="titulo-seccion">Solicitudes por cliente</h2>
          <Barras vacio="Sin solicitudes en el período." filas={aBarras(m.porCliente)} />
        </section>
      </div>

      <section className="tarjeta space-y-4">
        <div>
          <h2 className="titulo-seccion mb-1!">Piezas detenidas ({totalDetenidas})</h2>
          <p className="text-sm text-slate-500">
            Solicitudes abiertas sin cambios de etapa hace más de {dias} días. No depende del período elegido.
          </p>
        </div>
        {puede(u.rol, "admin") && <FormDiasAlerta dias={dias} />}
        {detenidas.length === 0 ? (
          <p className="text-sm text-slate-500">No hay ninguna. Todo se está moviendo.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {detenidas.map((s) => (
              <li key={s.id}>
                <Link href={`/solicitudes/${s.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-blue-800">{s.numero}</span>
                      <span className={`chip ${colorEstado(s.estado)}`}>{nombreEstado(s.estado)}</span>
                      {s.enEspera && <span className="chip bg-amber-100 text-amber-800">En espera</span>}
                    </div>
                    <div className="truncate text-sm">
                      {s.cliente.nombre} <span className="text-slate-500">· {s.vendedor.nombre}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xl font-bold tabular-nums">{diasDesde(s.fechaUltimoMovimiento)}</div>
                    <div className="text-xs text-slate-500">días</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {totalDetenidas > MAX_DETENIDAS && (
          <Link href="/solicitudes?detenidas=1" className="inline-block text-sm font-semibold text-blue-700 underline">
            Ver las {totalDetenidas} en el listado
          </Link>
        )}
      </section>
    </div>
  );
}
