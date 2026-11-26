import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EXTENSIONES_ADJUNTO, leerArchivo } from "@/lib/archivos";

// Planos y documentos de una pieza con código cargado, para quien escanea su etiqueta: sin sesión,
// con la clave del QR. Antes de cargar el código no se entrega nada por acá.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id: idTexto } = await params;
  const id = Number(idTexto);
  const a = Number.isInteger(id)
    ? await db.adjunto.findFirst({ where: { id, solicitud: { tokenQr: token, codigoPieza: { not: null } } } })
    : null;
  if (!a) return new NextResponse("No encontrado", { status: 404 });

  const contenido = await leerArchivo(a.ruta);
  if (!contenido) return new NextResponse("El archivo ya no está en el servidor", { status: 404 });

  const extension = a.ruta.split(".").pop() ?? "";
  const enLinea = EXTENSIONES_ADJUNTO[extension]?.enLinea;
  const disposicion = `${enLinea ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(a.nombreOriginal)}`;

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": a.mime,
      "Content-Length": String(contenido.length),
      "Content-Disposition": disposicion,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
