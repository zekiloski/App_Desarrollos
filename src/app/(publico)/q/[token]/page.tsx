import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { puedeVerSolicitud } from "@/lib/solicitudes";

// Destino del QR de la etiqueta de ingreso. Con el código de pieza ya cargado muestra la ficha pública de
// la pieza (sin iniciar sesión); antes de eso lleva a la ficha de la solicitud, que sí pide sesión.
export default async function PaginaQr({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const s = await db.solicitud.findUnique({
    where: { tokenQr: token },
    select: { id: true, numero: true, codigoPieza: true },
  });
  if (!s) notFound();
  if (s.codigoPieza) redirect(`/p/${encodeURIComponent(s.codigoPieza)}?k=${encodeURIComponent(token)}`);

  const u = await usuarioActual();
  if (!u) redirect(`/login?volver=${encodeURIComponent(`/q/${token}`)}`);
  if (await puedeVerSolicitud(u, s.id)) redirect(`/solicitudes/${s.id}`);

  return (
    <div className="tarjeta text-center">
      <h1 className="text-xl font-bold">Pieza {s.numero}</h1>
      <p className="mt-2 text-slate-600">
        Esta pieza pertenece a una solicitud que no es tuya, por eso no podés ver su ficha. Si la encontraste
        fuera de lugar, avisá en Recepción u Oficina Técnica indicando ese número.
      </p>
      <Link href="/solicitudes" className="btn btn-primario mt-4">
        Ir a mis solicitudes
      </Link>
    </div>
  );
}
