import { PrismaClient } from "@prisma/client";
import { cargarDatosIniciales } from "../src/lib/datos-iniciales";

// Carga los datos iniciales a mano (npm run db:seed). La app también los carga sola al arrancar.
// Con ADMIN_PASSWORD se crea solo el admin; sin ella (uso local) se crean los usuarios demo.
const db = new PrismaClient();

cargarDatosIniciales(db)
  .then(() => console.log("Datos iniciales cargados."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
