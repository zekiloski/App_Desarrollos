import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { puede } from "@/lib/permisos";
import { filtroVisibilidad } from "@/lib/solicitudes";
import { EXTENSIONES_ADJUNTO, TAMANO_MAX_ADJUNTO, guardarAdjunto } from "@/lib/archivos";

const MAX_ADJUNTOS_POR_SOLICITUD = 40;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(u.rol, "tecnico.editar")) {
    return NextResponse.json({ error: "Tu rol no puede adjuntar archivos." }, { status: 403 });
  }

  const solicitudId = Number((await params).id);
  const s = Number.isInteger(solicitudId)
    ? await db.solicitud.findFirst({
        where: { AND: [{ id: solicitudId }, filtroVisibilidad(u)] },
        select: { id: true, estado: true, _count: { select: { adjuntos: true } } },
      })
    : null;
  if (!s) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (s.estado === "CERRADA") {
    return NextResponse.json({ error: "La solicitud está cerrada: ya no se puede modificar." }, { status: 400 });
  }
  if (s._count.adjuntos >= MAX_ADJUNTOS_POR_SOLICITUD) {
    return NextResponse.json(
      { error: `La solicitud ya tiene el máximo de ${MAX_ADJUNTOS_POR_SOLICITUD} archivos.` },
      { status: 400 },
    );
  }

  const archivo = (await req.formData().catch(() => null))?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAX_ADJUNTO) {
    return NextResponse.json({ error: "El archivo es demasiado grande (máx. 25 MB)." }, { status: 413 });
  }

  // Se queda solo con el nombre, sin carpetas ni caracteres de control.
  const nombre = (archivo.name.split(/[\\/]/).pop() ?? "archivo").replace(/[\x00-\x1f]/g, "").slice(0, 200);
  const extension = nombre.includes(".") ? nombre.split(".").pop()!.toLowerCase() : "";
  const tipo = EXTENSIONES_ADJUNTO[extension];
  if (!tipo) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido. Se aceptan: ${Object.keys(EXTENSIONES_ADJUNTO).join(", ")}.` },
      { status: 400 },
    );
  }

  const guardado = await guardarAdjunto(s.id, extension, Buffer.from(await archivo.arrayBuffer()));
  const adjunto = await db.adjunto.create({
    data: {
      solicitudId: s.id,
      tipo: tipo.tipo,
      nombreOriginal: nombre,
      mime: tipo.mime,
      subidoPorId: u.id,
      ...guardado,
    },
    select: { id: true },
  });

  revalidatePath(`/solicitudes/${s.id}`);
  return NextResponse.json({ id: adjunto.id }, { status: 201 });
}
