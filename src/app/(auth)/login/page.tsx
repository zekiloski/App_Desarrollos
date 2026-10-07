import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";
import { SelectorTema } from "@/components/SelectorTema";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string }>;
}) {
  if (await usuarioActual()) redirect("/solicitudes");
  const { volver } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Oncativo S.A." width={300} height={82} className="mx-auto mb-4 h-auto w-64 rounded-lg bg-white" />
          <h1 className="text-2xl font-bold">Nuevos Desarrollos</h1>
          <p className="mt-1 text-sm text-slate-500">Seguimiento de piezas nuevas</p>
        </div>
        <div className="tarjeta">
          <FormLogin volver={volver ?? ""} />
        </div>
        <div className="mt-4 flex justify-center">
          <SelectorTema conTexto />
        </div>
      </div>
    </main>
  );
}
