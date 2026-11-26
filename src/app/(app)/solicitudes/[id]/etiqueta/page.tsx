import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { fecha } from "@/lib/formato";
import { urlBase } from "@/lib/url";
import { BotonImprimir } from "./BotonImprimir";
import { CorregirCodigo } from "../CorregirCodigo";

export const metadata: Metadata = { title: "Etiqueta" };

export default async function PaginaEtiqueta({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirUsuario();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const s = await db.solicitud.findFirst({
    where: { AND: [{ id }, filtroVisibilidad(u)] },
    select: {
      id: true,
      numero: true,
      tokenQr: true,
      etiquetaQr: true,
      codigoPieza: true,
      descripcion: true,
      fechaIngreso: true,
      cliente: { select: { nombre: true } },
      vendedor: { select: { nombre: true } },
    },
  });
  if (!s) notFound();

  // Abrir esta pantalla es "generar la etiqueta": queda registrado para no volver a preguntarlo.
  if (s.etiquetaQr !== "IMPRESA" && puede(u.rol, "ubicacion.editar")) {
    await db.solicitud.update({ where: { id: s.id }, data: { etiquetaQr: "IMPRESA" } });
  }

  // Mientras la pieza circula, el QR lleva un código automático (el enlace a la ficha). Cuando Oficina
  // Técnica carga a mano el código de pieza en la última etapa, el QR pasa a ser un enlace con ese código
  // que muestra en el celular los planos, la descripción y la fecha de alta del código.
  const base = await urlBase();
  const contenido = s.codigoPieza
    ? // La clave (?k=) permite abrirlo sin iniciar sesión; sin ella, el código solo no alcanza.
      `${base}/p/${encodeURIComponent(s.codigoPieza)}?k=${encodeURIComponent(s.tokenQr)}`
    : `${base}/q/${s.tokenQr}`;
  const qr = await QRCode.toString(contenido, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const esLocal = /\/\/(localhost|127\.)/.test(contenido);
  const editaCodigo = !!s.codigoPieza && puede(u.rol, "codigo.gestionar");

  return (
    <div className="space-y-4">
      {/* Al imprimir sale solo la etiqueta, a su tamaño real. */}
      <style>{`@media print { @page { margin: 6mm; } body { background: #fff !important; } }`}</style>

      <div className="space-y-3 print:hidden">
        <Link href={`/solicitudes/${s.id}`} className="inline-block text-sm font-semibold text-blue-700">
          ← Volver a la ficha
        </Link>
        <h1 className="text-2xl font-bold">Etiqueta de {s.numero}</h1>
        <p className="text-sm text-slate-600">
          Imprimila y pegala en la pieza. Mide 100 × 60 mm; en el cuadro de impresión elegí escala 100 %.
        </p>
        {esLocal && (
          <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            El QR apunta a “localhost”, que solo funciona en esta computadora. Para que abra desde un celular,
            configurá APP_URL en el archivo .env con la dirección real de la app.
          </p>
        )}

        <div className="tarjeta space-y-2">
          <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Código del QR</div>
          {s.codigoPieza ? (
            <>
              <div className="font-mono text-xl font-bold break-all">{s.codigoPieza}</div>
              <p className="text-sm text-slate-600">
                Es el código de pieza cargado a mano. Al escanear el QR con cualquier celular, sin iniciar sesión,
                se abre la ficha de la pieza con este código, los planos, la descripción y la fecha de alta del
                código. Si lo editás, la etiqueta impresa sigue funcionando, pero conviene reimprimirla para que el
                código escrito coincida.
              </p>
              {editaCodigo && <CorregirCodigo solicitudId={s.id} codigo={s.codigoPieza} texto="Editar código del QR" />}
            </>
          ) : (
            <>
              <div className="font-mono text-xl font-bold">{s.numero}</div>
              <p className="text-sm text-slate-600">
                Código automático de ingreso: el QR abre la ficha de la solicitud. Cuando se cargue el código de
                pieza en la etapa “Código creado”, el QR pasa a tener ese código y hay que reimprimir la etiqueta.
              </p>
            </>
          )}
        </div>

        <BotonImprimir />
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <div
          className="flex gap-[4mm] rounded-[2mm] border-2 border-black bg-white p-[4mm] text-black"
          style={{ width: "100mm", height: "60mm" }}
        >
          <div className="shrink-0 self-center" style={{ width: "46mm", height: "46mm" }}>
            <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Oncativo S.A." className="h-[8mm] w-auto self-start" />
            {s.codigoPieza ? (
              <div>
                <div className="text-[2.6mm] font-semibold tracking-wide uppercase">Código de pieza</div>
                <div className="font-mono text-[5mm] leading-none font-black break-all">{s.codigoPieza}</div>
                <div className="mt-[0.5mm] font-mono text-[2.8mm]">{s.numero}</div>
              </div>
            ) : (
              <div>
                <div className="text-[2.6mm] font-semibold tracking-wide uppercase">Nuevo desarrollo</div>
                <div className="font-mono text-[6mm] leading-none font-black">{s.numero}</div>
              </div>
            )}
            <div className="text-[3mm] leading-tight">
              <div className="truncate font-bold">{s.cliente.nombre}</div>
              <div className="line-clamp-2">{s.descripcion}</div>
            </div>
            <div className="text-[2.6mm] leading-tight">
              Ingresó {fecha(s.fechaIngreso)} · {s.vendedor.nombre}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs break-all text-slate-400 print:hidden">
        El QR abre: {contenido}
      </p>
    </div>
  );
}
