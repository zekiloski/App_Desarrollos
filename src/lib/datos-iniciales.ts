import type { PrismaClient, Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

// Datos con los que arranca una base nueva. Todo es "crear si no existe": nunca pisa datos ya cargados
// (contraseñas cambiadas, procesos editados, configuración). Lo usan prisma/seed.ts y el arranque de la app.

const USUARIOS_DEMO: { usuario: string; nombre: string; rol: Rol; password: string }[] = [
  { usuario: "admin", nombre: "Administrador", rol: "ADMIN", password: "admin1234" },
  { usuario: "vendedor", nombre: "Vendedor Demo", rol: "VENDEDOR", password: "demo1234" },
  { usuario: "vendedor2", nombre: "Vendedor Demo 2", rol: "VENDEDOR", password: "demo1234" },
  { usuario: "recepcion", nombre: "Recepción Demo", rol: "RECEPCION", password: "demo1234" },
  { usuario: "tecnica", nombre: "Oficina Técnica Demo", rol: "OFICINA_TECNICA", password: "demo1234" },
  { usuario: "produccion", nombre: "Producción Demo", rol: "PRODUCCION", password: "demo1234" },
];

const PROCESOS = [
  "Corte plasma",
  "Corte láser",
  "Corte sierra",
  "Guillotinado",
  "Plegado",
  "Rolado",
  "Torneado",
  "Fresado",
  "Perforado",
  "Roscado",
  "Estampado",
  "Soldadura",
  "Amolado / terminación",
  "Tratamiento térmico",
  "Granallado",
  "Pintura",
  "Zincado / galvanizado",
  "Armado",
];

// Con ADMIN_PASSWORD (servidor) se crea solo "admin" con esa contraseña. Sin ella, fuera de producción
// (uso local), se crean los usuarios demo; en producción no se crea ningún usuario con contraseña conocida.
export async function cargarDatosIniciales(db: PrismaClient, adminPassword = process.env.ADMIN_PASSWORD?.trim()) {
  if (adminPassword && adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD tiene que tener al menos 8 caracteres.");
  }
  const usuarios = adminPassword
    ? [{ usuario: "admin", nombre: "Administrador", rol: "ADMIN" as Rol, password: adminPassword }]
    : process.env.NODE_ENV === "production"
      ? []
      : USUARIOS_DEMO;
  if (!adminPassword && process.env.NODE_ENV === "production" && (await db.usuario.count()) === 0) {
    console.error("[datos iniciales] Falta ADMIN_PASSWORD: no hay usuarios y no se creó el admin.");
  }

  for (const u of usuarios) {
    await db.usuario.upsert({
      where: { usuario: u.usuario },
      update: {},
      create: {
        usuario: u.usuario,
        nombre: u.nombre,
        rol: u.rol,
        email: `${u.usuario}@ejemplo.local`,
        passwordHash: await bcrypt.hash(u.password, 10),
      },
    });
  }

  for (const [i, nombre] of PROCESOS.entries()) {
    await db.proceso.upsert({ where: { nombre }, update: {}, create: { nombre, orden: (i + 1) * 10 } });
  }

  await db.configuracion.upsert({
    where: { clave: "dias_alerta_sin_movimiento" },
    update: {},
    create: { clave: "dias_alerta_sin_movimiento", valor: "7" },
  });
}
