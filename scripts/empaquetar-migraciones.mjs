// Genera src/lib/migraciones.generado.ts con el SQL de prisma/migrations. Uso: node scripts/empaquetar-migraciones.mjs
//
// Así las migraciones viajan dentro de la app compilada y se aplican al arrancar (src/instrumentation.ts),
// aunque el hosting arranque la app sin pasar por "npm start" ni tenga la carpeta prisma/ disponible.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const carpeta = path.resolve("prisma/migrations");
const migraciones = readdirSync(carpeta)
  .filter((n) => statSync(path.join(carpeta, n)).isDirectory())
  .sort()
  .map((nombre) => {
    const sql = readFileSync(path.join(carpeta, nombre, "migration.sql"), "utf8");
    // Mismo checksum que calcula Prisma: SHA-256 del archivo.
    return { nombre, checksum: createHash("sha256").update(sql).digest("hex"), sql };
  });

const salida = `// Archivo generado por scripts/empaquetar-migraciones.mjs: no editar a mano.
export const MIGRACIONES: { nombre: string; checksum: string; sql: string }[] = ${JSON.stringify(migraciones, null, 2)};
`;
writeFileSync(path.resolve("src/lib/migraciones.generado.ts"), salida);
console.log(`Migraciones empaquetadas: ${migraciones.length}`);
