import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { fecha } from "@/lib/formato";
import { urlBase } from "@/lib/url";
import { BotonImprimir } from "./BotonImprimir";

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
      descripcion: true,
      fechaIngreso: true,
      cliente: { select: { nombre: true } },
      vendedor: { select: { nombre: true } },
    },
  });
  if (!s) notFound();

  const url = `${await urlBase()}/q/${s.tokenQr}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const esLocal = /\/\/(localhost|127\.)/.test(url);

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
            <div>
              <div className="text-[2.6mm] font-semibold tracking-wide uppercase">Nuevo desarrollo</div>
              <div className="font-mono text-[6mm] leading-none font-black">{s.numero}</div>
            </div>
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

      <p className="text-xs break-all text-slate-400 print:hidden">El QR abre: {url}</p>
    </div>
  );
}
