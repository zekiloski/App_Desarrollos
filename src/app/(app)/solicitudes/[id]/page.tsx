import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { filtroVisibilidad } from "@/lib/solicitudes";
import {
  COLOR_URGENCIA,
  ROLES,
  TIPOS_INGRESO,
  URGENCIAS,
  colorEstado,
  nombreEstado,
} from "@/lib/etiquetas";
import { fecha, fechaHora, hace, tamanoLegible } from "@/lib/formato";
import { EXTENSIONES_ADJUNTO } from "@/lib/archivos";
import { Progreso } from "@/components/Progreso";
import { DatosTecnicos } from "./DatosTecnicos";
import { EditorProcesos } from "./EditorProcesos";
import { Adjuntos } from "./Adjuntos";
import { CorregirCodigo } from "./CorregirCodigo";
import { indiceEstado } from "@/lib/estados";
import { GaleriaFotos } from "./GaleriaFotos";
import { FormComentario } from "./FormComentario";
import { AccionesEstado } from "./AccionesEstado";
import { FormUbicacion } from "./FormUbicacion";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fotosFallidas?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return {};
  const u = await requerirUsuario();
  const s = await db.solicitud.findFirst({
    where: { AND: [{ id }, filtroVisibilidad(u)] },
    select: { numero: true },
  });
  return { title: s?.numero };
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{nombre}</dt>
      <dd className="mt-0.5 break-words">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

export default async function PaginaFicha({ params, searchParams }: Props) {
  const u = await requerirUsuario();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const s = await db.solicitud.findFirst({
    where: { AND: [{ id }, filtroVisibilidad(u)] },
    include: {
      cliente: true,
      vendedor: { select: { nombre: true } },
      creadaPor: { select: { nombre: true } },
      tenidaPor: { select: { nombre: true } },
      fotos: { orderBy: { id: "asc" }, select: { id: true, ruta: true, rutaMiniatura: true } },
      comentarios: { orderBy: { fecha: "asc" }, include: { usuario: { select: { nombre: true, rol: true } } } },
      movimientosEstado: { orderBy: { id: "desc" }, include: { usuario: { select: { nombre: true } } } },
      procesos: { orderBy: { orden: "asc" }, include: { proceso: { select: { id: true, nombre: true } } } },
      adjuntos: { orderBy: { id: "asc" }, include: { subidoPor: { select: { nombre: true } } } },
      codigoCargadoPor: { select: { nombre: true } },
      cargadaEnProduccionPor: { select: { nombre: true } },
      exportaciones: { orderBy: { id: "desc" }, take: 1, include: { usuario: { select: { nombre: true } } } },
      movimientosUbicacion: {
        orderBy: { id: "desc" },
        take: 10,
        include: { usuario: { select: { nombre: true } }, tenidaPor: { select: { nombre: true } } },
      },
    },
  });
  if (!s) notFound();

  const fotosFallidas = Number((await searchParams).fotosFallidas) || 0;
  const esFisica = s.tipoIngreso !== "FOTOS";
  const editaUbicacion = esFisica && puede(u.rol, "ubicacion.editar");

  const [sectores, personas] = editaUbicacion
    ? await Promise.all([
        db.solicitud.findMany({
          where: { sector: { not: null } },
          distinct: ["sector"],
          select: { sector: true },
          orderBy: { sector: "asc" },
          take: 50,
        }),
        db.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
      ])
    : [[], []];

  const abierta = s.estado !== "CERRADA";
  const editaTecnico = abierta && puede(u.rol, "tecnico.editar");
  const gestionaCodigo = puede(u.rol, "codigo.gestionar");
  const catalogo = editaTecnico
    ? await db.proceso.findMany({
        where: { activo: true },
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: { id: true, nombre: true },
      })
    : [];

  // Lo que el sistema de producción necesita y todavía no está cargado.
  const faltantes = [
    !s.material && "material",
    !s.espesor && "espesor",
    !s.dimensiones && "dimensiones",
    s.procesos.length === 0 && "procesos",
  ].filter((x): x is string => !!x);
  const ultimaExportacion = s.exportaciones[0];

  // Describe cada movimiento de la línea de tiempo según qué cambió.
  const tituloMovimiento = (m: (typeof s.movimientosEstado)[number]) => {
    if (m.enEspera) return "Puesta en espera";
    if (m.estadoAnterior === m.estadoNuevo) return `Retomada en ${nombreEstado(m.estadoNuevo)}`;
    if (m.estadoAnterior && indiceEstado(m.estadoNuevo) < indiceEstado(m.estadoAnterior)) {
      return `Volvió a ${nombreEstado(m.estadoNuevo)}`;
    }
    return nombreEstado(m.estadoNuevo);
  };

  return (
    <div className="space-y-4">
      <Link href="/solicitudes" className="inline-block text-sm font-semibold text-blue-700">
        ← Volver al listado
      </Link>

      {fotosFallidas > 0 && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          La solicitud se guardó, pero {fotosFallidas === 1 ? "1 foto no se pudo subir" : `${fotosFallidas} fotos no se pudieron subir`}.
          Podés volver a agregarlas desde la sección Fotos.
        </p>
      )}

      <header className="tarjeta">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-bold text-blue-800">{s.numero}</h1>
          <span className={`chip ${colorEstado(s.estado)}`}>{nombreEstado(s.estado)}</span>
          {s.enEspera && <span className="chip bg-amber-100 text-amber-800">En espera</span>}
          <span className={`chip ${COLOR_URGENCIA[s.urgencia]}`}>Urgencia {URGENCIAS[s.urgencia].toLowerCase()}</span>
        </div>
        <p className="mt-1 text-lg font-semibold">{s.cliente.nombre}</p>
        <p className="text-sm text-slate-500">
          Ingresó el {fechaHora(s.fechaIngreso)} ({hace(s.fechaIngreso)}) · Último movimiento {hace(s.fechaUltimoMovimiento)}
        </p>
        <div className="mt-4">
          <Progreso estado={s.estado} tipoIngreso={s.tipoIngreso} enEspera={s.enEspera} aprobada={s.aprobada} />
        </div>
        {s.enEspera && s.motivoEspera && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <strong>En espera:</strong> {s.motivoEspera}
          </p>
        )}
        {s.estado === "RECHAZADA" || (s.estado === "CERRADA" && s.aprobada === false) ? (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
            <strong>Rechazada:</strong> {s.motivoRechazo}
          </p>
        ) : null}
      </header>

      <AccionesEstado
        solicitud={{ id: s.id, numero: s.numero, sector: s.sector, estante: s.estante }}
        flujo={{
          estado: s.estado,
          tipoIngreso: s.tipoIngreso,
          enEspera: s.enEspera,
          aprobada: s.aprobada,
          codigoPieza: s.codigoPieza,
          requiereMatriz: s.requiereMatriz,
          etiquetaQr: s.etiquetaQr,
        }}
        rol={u.rol}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="tarjeta">
            <h2 className="titulo-seccion">Pedido</h2>
            <p className="whitespace-pre-wrap">{s.descripcion}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Dato nombre="Tipo de ingreso">{TIPOS_INGRESO[s.tipoIngreso]}</Dato>
              <Dato nombre="Cantidad estimada">{s.cantidadEstimada?.toLocaleString("es-AR")}</Dato>
              <Dato nombre="Implemento / máquina">{s.implemento}</Dato>
              <Dato nombre="Vendedor">{s.vendedor.nombre}</Dato>
              {s.creadaPorId !== s.vendedorId && <Dato nombre="Cargada por">{s.creadaPor.nombre}</Dato>}
            </dl>
          </section>

          <section className="tarjeta">
            <h2 className="titulo-seccion">Datos técnicos</h2>
            <DatosTecnicos
              solicitudId={s.id}
              alcance={editaTecnico ? "todo" : abierta && puede(u.rol, "material.editar") ? "basico" : null}
              datos={{
                material: s.material,
                espesor: s.espesor,
                dimensiones: s.dimensiones,
                requiereMatriz: s.requiereMatriz,
                matrizObservaciones: s.matrizObservaciones,
                matrizCostoEstimado: s.matrizCostoEstimado?.toString() ?? null,
                matrizTiempoEstimadoDias: s.matrizTiempoEstimadoDias,
              }}
            />
          </section>

          <section className="tarjeta">
            <h2 className="titulo-seccion">Procesos ({s.procesos.length})</h2>
            <EditorProcesos
              solicitudId={s.id}
              asignados={s.procesos.map((p) => p.proceso)}
              catalogo={catalogo}
              puedeEditar={editaTecnico}
              puedeCatalogo={puede(u.rol, "procesos.catalogo")}
            />
          </section>

          <section className="tarjeta">
            <h2 className="titulo-seccion">Planos y documentos ({s.adjuntos.length})</h2>
            <Adjuntos
              solicitudId={s.id}
              puedeEditar={editaTecnico}
              extensiones={Object.keys(EXTENSIONES_ADJUNTO)}
              adjuntos={s.adjuntos.map((a) => ({
                id: a.id,
                nombre: a.nombreOriginal,
                tipo: a.tipo,
                tamano: tamanoLegible(a.tamano),
                detalle: `${a.subidoPor.nombre}, ${fecha(a.creadoEl)}`,
              }))}
            />
          </section>

          <section className="tarjeta">
            <h2 className="titulo-seccion">Fotos ({s.fotos.length})</h2>
            <GaleriaFotos
              solicitudId={s.id}
              puedeAgregar={puede(u.rol, "fotos.agregar")}
              fotos={s.fotos.map((f) => ({
                id: f.id,
                url: `/api/archivos/${f.ruta}`,
                urlMiniatura: `/api/archivos/${f.rutaMiniatura}`,
              }))}
            />
          </section>

          <section className="tarjeta">
            <h2 className="titulo-seccion">Comentarios ({s.comentarios.length})</h2>
            {s.comentarios.length > 0 && (
              <ul className="mb-4 space-y-3">
                {s.comentarios.map((c) => {
                  const mio = c.usuarioId === u.id;
                  return (
                    <li key={c.id} className={`flex ${mio ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          mio ? "bg-marca text-white" : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <div className={`text-xs font-semibold ${mio ? "text-white/85" : "text-slate-500"}`}>
                          {mio ? "Yo" : `${c.usuario.nombre} · ${ROLES[c.usuario.rol]}`}
                        </div>
                        <p className="break-words whitespace-pre-wrap">{c.texto}</p>
                        <div className={`mt-0.5 text-right text-xs ${mio ? "text-white/70" : "text-slate-400"}`}>
                          {fechaHora(c.fecha)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {puede(u.rol, "comentar") && <FormComentario solicitudId={s.id} />}
          </section>
        </div>

        <div className="space-y-4">
          <section className="tarjeta">
            <h2 className="titulo-seccion">Cliente</h2>
            <dl className="space-y-3">
              <Dato nombre="Nombre">{s.cliente.nombre}</Dato>
              <Dato nombre="Contacto">{s.cliente.contacto}</Dato>
              <Dato nombre="Teléfono">
                {s.cliente.telefono && (
                  <a href={`tel:${s.cliente.telefono}`} className="font-semibold text-blue-700">
                    {s.cliente.telefono}
                  </a>
                )}
              </Dato>
              <Dato nombre="Localidad">{s.cliente.localidad}</Dato>
            </dl>
          </section>

          {s.codigoPieza && (
            <section className="tarjeta space-y-3">
              <h2 className="titulo-seccion mb-0!">Sistema de producción</h2>
              <div>
                <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Código de pieza</div>
                <div className="font-mono text-xl font-bold break-all">{s.codigoPieza}</div>
                {s.codigoCargadoPor && s.codigoCargadoEl && (
                  <div className="text-xs text-slate-500">
                    Cargado por {s.codigoCargadoPor.nombre} el {fechaHora(s.codigoCargadoEl)}
                  </div>
                )}
              </div>
              {gestionaCodigo && s.estado === "CODIGO_CREADO" && (
                <CorregirCodigo solicitudId={s.id} codigo={s.codigoPieza} />
              )}

              {s.cargadaEnProduccionPor && s.cargadaEnProduccionEl ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <strong>Cargada en producción</strong> por {s.cargadaEnProduccionPor.nombre} el{" "}
                  {fechaHora(s.cargadaEnProduccionEl)}
                </p>
              ) : (
                faltantes.length > 0 && (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <strong>Faltan datos para producción:</strong> {faltantes.join(", ")}.
                  </p>
                )
              )}

              {gestionaCodigo && (
                <div>
                  <div className="etiqueta">Exportar para el sistema de producción</div>
                  <div className="flex gap-2">
                    <a href={`/api/solicitudes/${s.id}/exportar?formato=xlsx`} className="btn btn-secundario flex-1">
                      Excel
                    </a>
                    <a href={`/api/solicitudes/${s.id}/exportar?formato=csv`} className="btn btn-secundario flex-1">
                      CSV
                    </a>
                  </div>
                  {ultimaExportacion && (
                    <div className="mt-1 text-xs text-slate-500">
                      Última exportación: {ultimaExportacion.usuario.nombre}, {fechaHora(ultimaExportacion.fecha)}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {esFisica && (
            <section className="tarjeta">
              <h2 className="titulo-seccion">Ubicación en planta</h2>
              {s.sector || s.estante || s.tenidaPor ? (
                <dl className="space-y-3">
                  <Dato nombre="Sector">{s.sector}</Dato>
                  <Dato nombre="Estante">{s.estante}</Dato>
                  <Dato nombre="La tiene">{s.tenidaPor?.nombre}</Dato>
                </dl>
              ) : (
                <p className="text-sm text-slate-500">Todavía no se registró dónde está la pieza.</p>
              )}
              {editaUbicacion && (
                <>
                  <FormUbicacion
                    solicitudId={s.id}
                    actual={{ sector: s.sector, estante: s.estante, tenidaPorId: s.tenidaPorId }}
                    sectores={sectores.map((x) => x.sector).filter((x): x is string => !!x)}
                    personas={personas}
                  />
                  <Link href={`/solicitudes/${s.id}/etiqueta`} className="btn btn-secundario mt-2 w-full">
                    {s.etiquetaQr === "IMPRESA" ? "Volver a imprimir la etiqueta QR" : "Generar etiqueta con QR"}
                  </Link>
                  <p className="mt-1 text-center text-xs text-slate-500">
                    {s.etiquetaQr === "IMPRESA" && "Etiqueta ya generada."}
                    {s.etiquetaQr === "PENDIENTE" && "Etiqueta todavía sin generar."}
                    {s.etiquetaQr === "NO_REQUIERE" && "Se indicó que no hace falta etiqueta."}
                  </p>
                </>
              )}
              {s.movimientosUbicacion.length > 1 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-600">Ubicaciones anteriores</summary>
                  <ul className="mt-2 space-y-2">
                    {s.movimientosUbicacion.slice(1).map((m) => (
                      <li key={m.id}>
                        <div>
                          {[m.sector, m.estante, m.tenidaPor && `la tenía ${m.tenidaPor.nombre}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {fechaHora(m.fecha)} · {m.usuario.nombre}
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          <section className="tarjeta">
            <h2 className="titulo-seccion">Línea de tiempo</h2>
            <ol className="space-y-4 border-l-2 border-slate-200 pl-4">
              {s.movimientosEstado.map((m) => (
                <li key={m.id} className="relative">
                  <span className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border-2 border-superficie bg-marca" />
                  <div className="font-semibold">{tituloMovimiento(m)}</div>
                  <div className="text-sm text-slate-500">
                    {fechaHora(m.fecha)} · {m.usuario.nombre}
                  </div>
                  {m.motivo && <p className="mt-0.5 text-sm text-slate-700">{m.motivo}</p>}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-slate-400">Creada el {fecha(s.creadoEl)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
