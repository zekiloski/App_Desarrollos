import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { puedeVerSolicitud } from "@/lib/solicitudes";
import { EXTENSIONES_ADJUNTO, leerArchivo } from "@/lib/archivos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u) return new NextResponse("No autenticado", { status: 401 });

  const id = Number((await params).id);
  const a = Number.isInteger(id) ? await db.adjunto.findUnique({ where: { id } }) : null;
  if (!a || !(await puedeVerSolicitud(u, a.solicitudId))) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const contenido = await leerArchivo(a.ruta);
  if (!contenido) return new NextResponse("El archivo ya no está en el servidor", { status: 404 });

  const extension = a.ruta.split(".").pop() ?? "";
  const enLinea = EXTENSIONES_ADJUNTO[extension]?.enLinea;
  // PDF e imágenes se abren en el navegador; el resto (DWG, DXF, Office) se descarga.
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
