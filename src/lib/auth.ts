import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Rol } from "@prisma/client";
import { db } from "./db";
import { COOKIE_SESION, DURACION_SESION_SEG, firmarToken, leerToken } from "./token";
import { puede, type Accion } from "./permisos";
import { cargarPermisos } from "./permisos-db";

export type UsuarioSesion = {
  id: number;
  nombre: string;
  usuario: string;
  email: string;
  rol: Rol;
};

export async function crearSesion(uid: number) {
  const token = await firmarToken(uid);
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION_SEG,
  });
}

export async function cerrarSesionActual() {
  (await cookies()).delete(COOKIE_SESION);
}

// Se consulta la base en cada request para que un usuario desactivado pierda el acceso al instante.
export const usuarioActual = cache(async (): Promise<UsuarioSesion | null> => {
  // Toda verificación de permisos pasa primero por acá: se aprovecha para dejar cargados los vigentes.
  await cargarPermisos();
  const uid = await leerToken((await cookies()).get(COOKIE_SESION)?.value);
  if (!uid) return null;
  const u = await db.usuario.findUnique({
    where: { id: uid },
    select: { id: true, nombre: true, usuario: true, email: true, rol: true, activo: true },
  });
  if (!u || !u.activo) return null;
  return { id: u.id, nombre: u.nombre, usuario: u.usuario, email: u.email, rol: u.rol };
});

export async function requerirUsuario(): Promise<UsuarioSesion> {
  const u = await usuarioActual();
  if (!u) redirect("/login");
  return u;
}

export async function requerirPermiso(accion: Accion): Promise<UsuarioSesion> {
  const u = await requerirUsuario();
  if (!puede(u.rol, accion)) redirect("/solicitudes");
  return u;
}
