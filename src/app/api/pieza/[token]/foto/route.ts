import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { leerArchivo } from "@/lib/archivos";

// Primera foto de una pieza con código cargado, para quien escanea su etiqueta (sin sesión, con la clave
// del QR). ?mini=1 entrega la miniatura.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const f = await db.foto.findFirst({
    where: { solicitud: { tokenQr: token, codigoPieza: { not: null } } },
    orderBy: { id: "asc" },
    select: { ruta: true, rutaMiniatura: true },
  });
  if (!f) return new NextResponse("No encontrado", { status: 404 });

  const contenido = await leerArchivo(req.nextUrl.searchParams.get("mini") ? f.rutaMiniatura : f.ruta);
  if (!contenido) return new NextResponse("No encontrado", { status: 404 });

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(contenido.length),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
