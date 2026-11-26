import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { fecha, tamanoLegible } from "@/lib/formato";

type Props = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ k?: string }>;
};

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

const DATOS = {
  id: true,
  numero: true,
  tokenQr: true,
  codigoPieza: true,
  codigoCargadoEl: true,
  descripcion: true,
  material: true,
  espesor: true,
  dimensiones: true,
  procesos: { orderBy: { orden: "asc" }, select: { id: true, observaciones: true, proceso: { select: { nombre: true } } } },
  adjuntos: { orderBy: { id: "asc" }, select: { id: true, tipo: true, nombreOriginal: true, mime: true, tamano: true } },
  fotos: { orderBy: { id: "asc" }, take: 1, select: { id: true } },
} as const;

// Destino del QR de una pieza con código cargado. El enlace lleva la clave de la etiqueta (?k=): con ella
// se ve sin iniciar sesión. El código solo es fácil de adivinar, así que sin clave hace falta sesión.
export default async function PaginaPieza({ params, searchParams }: Props) {
  const codigo = leerCodigo((await params).codigo);
  const { k } = await searchParams;

  let s = k
    ? await db.solicitud.findFirst({ where: { tokenQr: k, codigoPieza: { not: null } }, select: DATOS })
    : null;

  if (s) {
    // Si después de imprimir se corrigió el código, la etiqueta sigue funcionando y lleva al código actual.
    if (s.codigoPieza !== codigo) {
      redirect(`/p/${encodeURIComponent(s.codigoPieza!)}?k=${encodeURIComponent(s.tokenQr)}`);
    }
  } else {
    const u = await usuarioActual();
    if (!u) redirect(`/login?volver=${encodeURIComponent(`/p/${encodeURIComponent(codigo)}`)}`);
    s = await db.solicitud.findFirst({ where: { AND: [{ codigoPieza: codigo }, filtroVisibilidad(u)] }, select: DATOS });
    if (!s) notFound();
  }

  const u = await usuarioActual();
  const archivo = (ruta: string) => `/api/pieza/${encodeURIComponent(s.tokenQr)}/${ruta}`;
  // Primero los planos, después imágenes y documentos.
  const orden = { PLANO: 0, IMAGEN: 1, DOCUMENTO: 2 };
  const adjuntos = [...s.adjuntos].sort((a, b) => orden[a.tipo] - orden[b.tipo] || a.id - b.id);

  return (
    <>
      <header className="tarjeta">
        <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Código de pieza</div>
        <h1 className="font-mono text-3xl font-black break-all text-blue-800">{s.codigoPieza}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Alta del código:{" "}
          <strong className="text-slate-800">{s.codigoCargadoEl ? fecha(s.codigoCargadoEl) : "—"}</strong>
        </p>
        <p className="mt-3 whitespace-pre-wrap">{s.descripcion}</p>
        <p className="mt-2 text-sm text-slate-500">
          Solicitud <span className="font-mono">{s.numero}</span>
        </p>
      </header>

      <section className="tarjeta">
        <h2 className="titulo-seccion">Planos ({adjuntos.length})</h2>
        {adjuntos.length === 0 ? (
          <p className="text-sm text-slate-500">Esta pieza no tiene planos cargados.</p>
        ) : (
          <ul className="space-y-3">
            {adjuntos.map((a) => {
              const url = archivo(`adjuntos/${a.id}`);
              return (
                <li key={a.id}>
                  {a.mime.startsWith("image/") ? (
                    <a href={url} target="_blank" rel="noopener" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={a.nombreOriginal} className="w-full rounded-xl border border-slate-200 bg-white" />
                      <span className="mt-1 block text-sm break-all text-slate-500">{a.nombreOriginal}</span>
                    </a>
                  ) : (
                    <a href={url} target="_blank" rel="noopener" className="btn btn-secundario w-full justify-between gap-3 text-left">
                      <span className="min-w-0 break-all">{a.nombreOriginal}</span>
                      <span className="shrink-0 text-xs font-normal text-slate-500">
                        {a.tipo === "PLANO" ? "Plano" : "Documento"} · {tamanoLegible(a.tamano)}
                      </span>
                    </a>
                  )}
                </li>
              );
            })}
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
              <a href={archivo("foto")} target="_blank" rel="noopener" className="mt-1 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={archivo("foto?mini=1")} alt="Foto de la pieza" className="h-32 w-32 rounded-xl object-cover" />
              </a>
            </div>
          )}
        </dl>
      </section>

      {u && (
        <Link href={`/solicitudes/${s.id}`} className="btn btn-secundario w-full">
          Ver la ficha completa de la solicitud
        </Link>
      )}
    </>
  );
}
