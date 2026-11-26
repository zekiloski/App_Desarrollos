import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { fecha, fechaHora, tamanoLegible } from "@/lib/formato";

type Props = { params: Promise<{ codigo: string }> };

// Según la versión de Next el parámetro llega codificado o no; un "%" suelto no debe romper la página.
function leerCodigo(crudo: string) {
  try {
    return decodeURIComponent(crudo);
  } catch {
    return crudo;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: leerCodigo((await params).codigo) };
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{nombre}</dt>
      <dd className="mt-0.5 break-words">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

// Destino del QR de una pieza con código cargado: lo que hace falta ver con el celular en la planta.
// Si no hay sesión, el middleware manda al login y vuelve acá.
export default async function PaginaPieza({ params }: Props) {
  const u = await requerirUsuario();
  const codigo = leerCodigo((await params).codigo);

  const existe = await db.solicitud.findUnique({ where: { codigoPieza: codigo }, select: { id: true } });
  if (!existe) notFound();

  const s = await db.solicitud.findFirst({
    where: { AND: [{ id: existe.id }, filtroVisibilidad(u)] },
    include: {
      cliente: { select: { nombre: true } },
      codigoCargadoPor: { select: { nombre: true } },
      procesos: { orderBy: { orden: "asc" }, include: { proceso: { select: { nombre: true } } } },
      adjuntos: { orderBy: { id: "asc" } },
      fotos: { orderBy: { id: "asc" }, take: 1, select: { ruta: true, rutaMiniatura: true } },
    },
  });

  if (!s) {
    return (
      <div className="tarjeta mx-auto max-w-md text-center">
        <h1 className="font-mono text-xl font-bold">{codigo}</h1>
        <p className="mt-2 text-slate-600">
          Esta pieza pertenece a una solicitud que no es tuya, por eso no podés ver su información. Consultá en
          Oficina Técnica indicando ese código.
        </p>
        <Link href="/solicitudes" className="btn btn-primario mt-4">
          Ir a mis solicitudes
        </Link>
      </div>
    );
  }

  // Primero los planos, después imágenes y documentos.
  const orden = { PLANO: 0, IMAGEN: 1, DOCUMENTO: 2 };
  const adjuntos = [...s.adjuntos].sort((a, b) => orden[a.tipo] - orden[b.tipo] || a.id - b.id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="tarjeta">
        <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Código de pieza</div>
        <h1 className="font-mono text-3xl font-black break-all text-blue-800">{s.codigoPieza}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Alta del código: <strong className="text-slate-800">{s.codigoCargadoEl ? fecha(s.codigoCargadoEl) : "—"}</strong>
          {s.codigoCargadoPor && ` · ${s.codigoCargadoPor.nombre}`}
        </p>
        <p className="mt-3 whitespace-pre-wrap">{s.descripcion}</p>
        <p className="mt-2 text-sm text-slate-500">
          {s.cliente.nombre} · Solicitud <span className="font-mono">{s.numero}</span>
        </p>
      </header>

      <section className="tarjeta">
        <h2 className="titulo-seccion">Planos ({adjuntos.length})</h2>
        {adjuntos.length === 0 ? (
          <p className="text-sm text-slate-500">Esta pieza no tiene planos cargados.</p>
        ) : (
          <ul className="space-y-3">
            {adjuntos.map((a) => (
              <li key={a.id}>
                {a.mime.startsWith("image/") ? (
                  <a href={`/api/adjuntos/${a.id}`} target="_blank" rel="noopener" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/adjuntos/${a.id}`}
                      alt={a.nombreOriginal}
                      className="w-full rounded-xl border border-slate-200 bg-white"
                    />
                    <span className="mt-1 block text-sm break-all text-slate-500">{a.nombreOriginal}</span>
                  </a>
                ) : (
                  <a
                    href={`/api/adjuntos/${a.id}`}
                    target="_blank"
                    rel="noopener"
                    className="btn btn-secundario w-full justify-between gap-3 text-left"
                  >
                    <span className="min-w-0 break-all">{a.nombreOriginal}</span>
                    <span className="shrink-0 text-xs font-normal text-slate-500">
                      {a.tipo === "PLANO" ? "Plano" : "Documento"} · {tamanoLegible(a.tamano)}
                    </span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="titulo-seccion">Información técnica</h2>
        <dl className="grid grid-cols-2 gap-4">
          <Dato nombre="Material">{s.material}</Dato>
          <Dato nombre="Espesor">{s.espesor}</Dato>
          <div className="col-span-2">
            <Dato nombre="Dimensiones">{s.dimensiones}</Dato>
          </div>
          <div className="col-span-2">
            <Dato nombre="Procesos">
              {s.procesos.length > 0 && (
                <ol className="list-decimal space-y-0.5 pl-5">
                  {s.procesos.map((p) => (
                    <li key={p.id}>
                      {p.proceso.nombre}
                      {p.observaciones && <span className="text-slate-500"> — {p.observaciones}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </Dato>
          </div>
          {s.fotos[0] && (
            <div className="col-span-2">
              <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Foto</dt>
              <a href={`/api/archivos/${s.fotos[0].ruta}`} target="_blank" rel="noopener" className="mt-1 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/archivos/${s.fotos[0].rutaMiniatura}`}
                  alt="Foto de la pieza"
                  className="h-32 w-32 rounded-xl object-cover"
                />
              </a>
            </div>
          )}
        </dl>
        {s.cargadaEnProduccionEl && (
          <p className="mt-4 text-xs text-slate-500">Cargada en el sistema de producción el {fechaHora(s.cargadaEnProduccionEl)}</p>
        )}
      </section>

      <Link href={`/solicitudes/${s.id}`} className="btn btn-secundario w-full">
        Ver la ficha completa de la solicitud
      </Link>
    </div>
  );
}
