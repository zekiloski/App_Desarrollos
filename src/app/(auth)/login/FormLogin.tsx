"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/server/auth-acciones";

export function FormLogin({ volver }: { volver: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="volver" value={volver} />
      <div>
        <label htmlFor="usuario" className="etiqueta">
          Usuario o email
        </label>
        <input
          id="usuario"
          name="usuario"
          className="campo"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="password" className="etiqueta">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="campo"
          autoComplete="current-password"
          required
        />
      </div>
      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      <button type="submit" className="btn btn-primario w-full" disabled={enviando}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
