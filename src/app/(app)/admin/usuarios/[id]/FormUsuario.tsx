"use client";

import { useActionState } from "react";
import type { Rol } from "@prisma/client";
import { guardarUsuario, type EstadoUsuario } from "@/server/usuarios-acciones";
import { ROLES } from "@/lib/etiquetas";

type UsuarioEditable = {
  id: number;
  nombre: string;
  usuario: string;
  email: string;
  rol: Rol;
  telefono: string | null;
  activo: boolean;
};

export function FormUsuario({ usuario }: { usuario: UsuarioEditable | null }) {
  const [estado, accion, enviando] = useActionState<EstadoUsuario, FormData>(
    guardarUsuario.bind(null, usuario?.id ?? null),
    {},
  );
  const campos = estado.campos ?? {};
  const claseCampo = (k: string) => `campo ${campos[k] ? "campo-error" : ""}`;
  const errorDe = (k: string) =>
    campos[k] ? <p className="mt-1 text-sm font-medium text-red-600">{campos[k]}</p> : null;

  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="nombre" className="etiqueta">
          Nombre y apellido *
        </label>
        <input id="nombre" name="nombre" className={claseCampo("nombre")} defaultValue={usuario?.nombre} required />
        {errorDe("nombre")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="usuario" className="etiqueta">
            Usuario *
          </label>
          <input
            id="usuario"
            name="usuario"
            className={claseCampo("usuario")}
            defaultValue={usuario?.usuario}
            autoCapitalize="none"
            autoComplete="off"
            required
          />
          {errorDe("usuario")}
        </div>
        <div>
          <label htmlFor="rol" className="etiqueta">
            Rol *
          </label>
          <select id="rol" name="rol" className={claseCampo("rol")} defaultValue={usuario?.rol ?? "VENDEDOR"}>
            {Object.entries(ROLES).map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
          {errorDe("rol")}
        </div>
      </div>
      <div>
        <label htmlFor="email" className="etiqueta">
          Email * <span className="font-normal text-slate-500">(para los avisos)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className={claseCampo("email")}
          defaultValue={usuario?.email}
          autoComplete="off"
          required
        />
        {errorDe("email")}
      </div>
      <div>
        <label htmlFor="telefono" className="etiqueta">
          Teléfono
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          className={claseCampo("telefono")}
          defaultValue={usuario?.telefono ?? ""}
        />
        {errorDe("telefono")}
      </div>
      <div>
        <label htmlFor="password" className="etiqueta">
          {usuario ? "Nueva contraseña" : "Contraseña inicial *"}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className={claseCampo("password")}
          autoComplete="new-password"
          minLength={8}
          required={!usuario}
          placeholder={usuario ? "Dejar vacío para no cambiarla" : "Mínimo 8 caracteres"}
        />
        {errorDe("password")}
      </div>
      <label className="flex min-h-12 cursor-pointer items-center gap-3">
        <input type="checkbox" name="activo" defaultChecked={usuario?.activo ?? true} className="h-6 w-6" />
        <span className="font-semibold">Usuario activo</span>
        <span className="text-sm text-slate-500">(si se desmarca, no puede ingresar)</span>
      </label>

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      <button type="submit" className="btn btn-primario w-full" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
