import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puedeVerSolicitud } from "@/lib/solicitudes";

// Destino del código QR de la etiqueta. Si no hay sesión, el middleware manda al login y vuelve acá.
export default async function PaginaQr({ params }: { params: Promise<{ token: string }> }) {
  const u = await requerirUsuario();
  const { token } = await params;

  const s = await db.solicitud.findUnique({ where: { tokenQr: token }, select: { id: true, numero: true } });
  if (!s) notFound();
  if (await puedeVerSolicitud(u, s.id)) redirect(`/solicitudes/${s.id}`);

  return (
    <div className="tarjeta mx-auto max-w-md text-center">
      <h1 className="text-xl font-bold">Pieza {s.numero}</h1>
      <p className="mt-2 text-slate-600">
        Esta pieza pertenece a una solicitud de otro vendedor, por eso no podés ver su ficha. Si la encontraste
        fuera de lugar, avisá en Recepción u Oficina Técnica indicando ese número.
      </p>
      <Link href="/solicitudes" className="btn btn-primario mt-4">
        Ir a mis solicitudes
      </Link>
    </div>
  );
}
