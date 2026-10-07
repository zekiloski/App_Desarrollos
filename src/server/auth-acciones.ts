"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { cerrarSesionActual, crearSesion } from "@/lib/auth";

export type EstadoLogin = { error?: string };

// Freno simple contra fuerza bruta: en memoria, por usuario. Se reinicia al reiniciar la app.
const MAX_INTENTOS = 8;
const VENTANA_MS = 15 * 60 * 1000;
const intentos = new Map<string, { cantidad: number; desde: number }>();

function bloqueado(clave: string) {
  const i = intentos.get(clave);
  if (!i) return false;
  if (Date.now() - i.desde > VENTANA_MS) {
    intentos.delete(clave);
    return false;
  }
  return i.cantidad >= MAX_INTENTOS;
}

function registrarFallo(clave: string) {
  const i = intentos.get(clave);
  if (!i || Date.now() - i.desde > VENTANA_MS) intentos.set(clave, { cantidad: 1, desde: Date.now() });
  else i.cantidad++;
}

// Solo rutas internas, para que el parámetro "volver" no sirva para redirigir a otro sitio.
function destinoSeguro(volver: string) {
  return volver.startsWith("/") && !volver.startsWith("//") && !volver.includes("\\") ? volver : "/solicitudes";
}

export async function iniciarSesion(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const identificador = String(fd.get("usuario") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!identificador || !password) return { error: "Ingresá usuario y contraseña." };

  const clave = identificador.toLowerCase();
  if (bloqueado(clave)) return { error: "Demasiados intentos. Probá de nuevo en 15 minutos." };

  const u = await db.usuario.findFirst({
    where: { OR: [{ usuario: identificador }, { email: identificador }] },
  });
  const ok = !!u && u.activo && (await bcrypt.compare(password, u.passwordHash));
  if (!ok) {
    registrarFallo(clave);
    return { error: "Usuario o contraseña incorrectos." };
  }

  intentos.delete(clave);
  await crearSesion(u.id);
  redirect(destinoSeguro(String(fd.get("volver") ?? "")));
}

export async function cerrarSesion() {
  await cerrarSesionActual();
  redirect("/login");
}
