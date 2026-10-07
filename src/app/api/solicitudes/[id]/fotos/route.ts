import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { puedeVerSolicitud } from "@/lib/solicitudes";
import { TAMANO_MAX_FOTO, guardarFoto } from "@/lib/archivos";

const MAX_FOTOS_POR_SOLICITUD = 40;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const solicitudId = Number((await params).id);
  if (!Number.isInteger(solicitudId) || !(await puedeVerSolicitud(u, solicitudId))) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  const cantidad = await db.foto.count({ where: { solicitudId } });
  if (cantidad >= MAX_FOTOS_POR_SOLICITUD) {
    return NextResponse.json(
      { error: `La solicitud ya tiene el máximo de ${MAX_FOTOS_POR_SOLICITUD} fotos.` },
      { status: 400 },
    );
  }

  const archivo = (await req.formData().catch(() => null))?.get("foto");
  if (!(archivo instanceof Blob) || archivo.size === 0) {
    return NextResponse.json({ error: "No se recibió ninguna foto." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAX_FOTO) {
    return NextResponse.json({ error: "La foto es demasiado grande (máx. 20 MB)." }, { status: 413 });
  }

  let guardada;
  try {
    guardada = await guardarFoto(solicitudId, Buffer.from(await archivo.arrayBuffer()));
  } catch {
    return NextResponse.json(
      { error: "El archivo no es una imagen válida o el formato no está soportado." },
      { status: 400 },
    );
  }

  const foto = await db.foto.create({
    data: { solicitudId, subidaPorId: u.id, ...guardada },
    select: { id: true },
  });
  revalidatePath(`/solicitudes/${solicitudId}`);
  return NextResponse.json({ id: foto.id }, { status: 201 });
}
