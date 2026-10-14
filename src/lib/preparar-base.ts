import { db } from "./db";
import { cargarDatosIniciales } from "./datos-iniciales";
import { MIGRACIONES } from "./migraciones.generado";

// Deja la base lista al arrancar la app: aplica las migraciones que falten y carga los datos iniciales.
// Usa la misma tabla de control que "prisma migrate deploy", así ambos caminos son intercambiables.

const TABLA_CONTROL = `CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`checksum\` VARCHAR(64) NOT NULL,
  \`finished_at\` DATETIME(3) NULL,
  \`migration_name\` VARCHAR(255) NOT NULL,
  \`logs\` TEXT NULL,
  \`rolled_back_at\` DATETIME(3) NULL,
  \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`applied_steps_count\` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

// El SQL que genera Prisma tiene una sentencia por bloque, terminada en ";" al final de la línea.
function sentencias(sql: string) {
  return sql
    .split(/;\s*$/m)
    .map((s) =>
      s
        .split("\n")
        .filter((l) => !l.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

async function aplicarMigraciones() {
  await db.$executeRawUnsafe(TABLA_CONTROL);
  const filas = await db.$queryRawUnsafe<{ migration_name: string; finished_at: Date | null }[]>(
    "SELECT migration_name, finished_at FROM `_prisma_migrations` WHERE rolled_back_at IS NULL",
  );
  const incompleta = filas.find((f) => !f.finished_at);
  if (incompleta) {
    throw new Error(`La migración ${incompleta.migration_name} quedó a medias: hay que revisarla a mano.`);
  }
  const aplicadas = new Set(filas.map((f) => f.migration_name));

  for (const m of MIGRACIONES) {
    if (aplicadas.has(m.nombre)) continue;
    const id = crypto.randomUUID();
    await db.$executeRawUnsafe(
      "INSERT INTO `_prisma_migrations` (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, NOW(3), 0)",
      id,
      m.checksum,
      m.nombre,
    );
    for (const s of sentencias(m.sql)) await db.$executeRawUnsafe(s);
    await db.$executeRawUnsafe(
      "UPDATE `_prisma_migrations` SET finished_at = NOW(3), applied_steps_count = 1 WHERE id = ?",
      id,
    );
    console.log(`[base] Migración aplicada: ${m.nombre}`);
  }
}

export async function prepararBase() {
  await aplicarMigraciones();
  await cargarDatosIniciales(db);
  console.log("[base] Lista.");
}
