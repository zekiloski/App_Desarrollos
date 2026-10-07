"use client";

import { useActionState } from "react";
import type { Rol } from "@prisma/client";
import { GRUPOS_PERMISOS, ROLES_CONFIGURABLES, type MatrizPermisos } from "@/lib/permisos";
import { guardarPermisos, type EstadoPermisos } from "@/server/admin-acciones";

const ROL_CORTO: Record<Rol, string> = {
  VENDEDOR: "Vendedor",
  RECEPCION: "Recepción",
  OFICINA_TECNICA: "Of. Técnica",
  PRODUCCION: "Producción",
  ADMIN: "Admin",
};

export function FormPermisos({ matriz }: { matriz: MatrizPermisos }) {
  const [estado, accion, enviando] = useActionState<EstadoPermisos, FormData>(guardarPermisos, {});

  return (
    // La key vuelve a dibujar las casillas con lo guardado (necesario al restablecer).
    <form action={accion} key={JSON.stringify(matriz)} className="space-y-4">
      {GRUPOS_PERMISOS.map((g) => (
        <section key={g.titulo} className="tarjeta">
          <h2 className="titulo-seccion">{g.titulo}</h2>
          <ul className="divide-y divide-slate-200">
            {g.permisos.map((p) => (
              <li key={p.accion} className="py-3 first:pt-0 last:pb-0">
                <div className="font-semibold">{p.nombre}</div>
                {p.detalle && <div className="text-sm text-slate-500">{p.detalle}</div>}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ROLES_CONFIGURABLES.map((rol) => (
                    <label
                      key={rol}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium has-checked:border-blue-700 has-checked:bg-blue-50 has-checked:text-blue-800"
                    >
                      <input
                        type="checkbox"
                        name={`${p.accion}|${rol}`}
                        defaultChecked={matriz[p.accion].includes(rol)}
                        className="h-5 w-5"
                      />
                      {ROL_CORTO[rol]}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {estado.mensaje}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="btn btn-primario sm:flex-1" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar permisos"}
        </button>
        <button
          type="submit"
          name="restablecer"
          value="1"
          className="btn btn-secundario"
          disabled={enviando}
          onClick={(e) => {
            if (!window.confirm("¿Volver todos los permisos a los valores originales?")) e.preventDefault();
          }}
        >
          Restablecer originales
        </button>
      </div>
    </form>
  );
}
