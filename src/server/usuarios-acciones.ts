"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requerirUsuario } from "@/lib/auth";
import { puede } from "@/lib/permisos";

export type EstadoUsuario = { error?: string; campos?: Record<string, string> };

const esquema = z.object({
  nombre: z.string().trim().min(2, "Indicá el nombre").max(120),
  usuario: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo"),
  email: z.string().trim().email("Email inválido").max(160),
  rol: z.enum(["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"]),
  telefono: z.string().trim().max(40).optional(),
  password: z.string().min(8, "Mínimo 8 caracteres").max(100).optional(),
  activo: z.boolean(),
});

export async function guardarUsuario(
  id: number | null,
  _prev: EstadoUsuario,
  fd: FormData,
): Promise<EstadoUsuario> {
  const yo = await requerirUsuario();
  if (!puede(yo.rol, "admin")) return { error: "Solo Gerencia / Admin puede gestionar usuarios." };

  const txt = (k: string) => {
    const v = String(fd.get(k) ?? "");
    return v.trim() === "" ? undefined : v;
  };
  const r = esquema.safeParse({
    nombre: txt("nombre"),
    usuario: txt("usuario"),
    email: txt("email"),
    rol: txt("rol"),
    telefono: txt("telefono"),
    password: txt("password"),
    activo: fd.get("activo") === "on",
  });
  if (!r.success) {
    const campos: Record<string, string> = {};
    for (const i of r.error.issues) {
      const k = String(i.path[0] ?? "");
      if (k && !campos[k]) campos[k] = i.message;
    }
    return { error: "Revisá los campos marcados.", campos };
  }
  const d = r.data;

  if (id === null && !d.password) {
    return { error: "Revisá los campos marcados.", campos: { password: "Indicá una contraseña inicial" } };
  }
  // Evita que el admin se quede afuera de su propia cuenta.
  if (id === yo.id && (!d.activo || d.rol !== "ADMIN")) {
    return { error: "No podés desactivarte ni quitarte el rol de administrador a vos mismo." };
  }

  const repetido = await db.usuario.findFirst({
    where: { OR: [{ usuario: d.usuario }, { email: d.email }], NOT: id ? { id } : undefined },
  });
  if (repetido) {
    const campo = repetido.usuario.toLowerCase() === d.usuario.toLowerCase() ? "usuario" : "email";
    return { error: "Revisá los campos marcados.", campos: { [campo]: "Ya está en uso por otro usuario" } };
  }

  const datos = {
    nombre: d.nombre,
    usuario: d.usuario,
    email: d.email,
    rol: d.rol,
    telefono: d.telefono ?? null,
    activo: d.activo,
  };
  const passwordHash = d.password ? await bcrypt.hash(d.password, 10) : undefined;

  if (id === null) {
    await db.usuario.create({ data: { ...datos, passwordHash: passwordHash! } });
  } else {
    await db.usuario.update({ where: { id }, data: { ...datos, ...(passwordHash ? { passwordHash } : {}) } });
  }

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}
