import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth";
import { puedeVerSolicitud } from "@/lib/solicitudes";
import { leerArchivo } from "@/lib/archivos";

const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};

// Los archivos viven fuera de /public: solo se entregan a usuarios con acceso a la solicitud.
export async function GET(_req: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  const u = await usuarioActual();
  if (!u) return new NextResponse("No autenticado", { status: 401 });

  const { ruta } = await params;
  const relativa = ruta.join("/");
  // Solo fotos: los adjuntos se descargan por /api/adjuntos/{id}, que conoce su nombre original.
  const m = /^solicitudes\/(\d+)\/fotos\/[A-Za-z0-9_-]+\.(jpg)$/.exec(relativa);
  if (!m || !(await puedeVerSolicitud(u, Number(m[1])))) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const contenido = await leerArchivo(relativa);
  if (!contenido) return new NextResponse("No encontrado", { status: 404 });

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": TIPOS[m[2]] ?? "application/octet-stream",
      "Content-Length": String(contenido.length),
      // Los nombres son únicos y el contenido no cambia: se puede cachear en el dispositivo.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
