import { PrismaClient, type Rol } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Usuarios de prueba, uno por rol. Si ya existen no se tocan (no se pisan contraseñas cambiadas).
const USUARIOS: { usuario: string; nombre: string; rol: Rol; password: string }[] = [
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

async function main() {
  for (const u of USUARIOS) {
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

  console.log("Datos iniciales cargados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
