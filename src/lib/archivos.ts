import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const LADO_MAX = 1600;
const LADO_MINIATURA = 400;

export const TAMANO_MAX_FOTO = 20 * 1024 * 1024;

export function raizStorage() {
  return path.resolve(process.env.STORAGE_DIR || "./storage");
}

// Devuelve null si la ruta intenta salir de la carpeta de storage.
export function rutaAbsoluta(rutaRelativa: string) {
  const raiz = raizStorage();
  const abs = path.resolve(raiz, rutaRelativa);
  return abs.startsWith(raiz + path.sep) ? abs : null;
}

export async function leerArchivo(rutaRelativa: string) {
  const abs = rutaAbsoluta(rutaRelativa);
  if (!abs) return null;
  try {
    return await readFile(abs);
  } catch {
    return null;
  }
}

export const TAMANO_MAX_ADJUNTO = 25 * 1024 * 1024;

// Tipos de archivo aceptados como adjunto. "enLinea": el navegador lo muestra en vez de descargarlo.
export const EXTENSIONES_ADJUNTO: Record<
  string,
  { mime: string; tipo: "PLANO" | "IMAGEN" | "DOCUMENTO"; enLinea?: boolean }
> = {
  pdf: { mime: "application/pdf", tipo: "PLANO", enLinea: true },
  dwg: { mime: "application/acad", tipo: "PLANO" },
  dxf: { mime: "application/dxf", tipo: "PLANO" },
  step: { mime: "application/step", tipo: "PLANO" },
  stp: { mime: "application/step", tipo: "PLANO" },
  iges: { mime: "model/iges", tipo: "PLANO" },
  igs: { mime: "model/iges", tipo: "PLANO" },
  jpg: { mime: "image/jpeg", tipo: "IMAGEN", enLinea: true },
  jpeg: { mime: "image/jpeg", tipo: "IMAGEN", enLinea: true },
  png: { mime: "image/png", tipo: "IMAGEN", enLinea: true },
  doc: { mime: "application/msword", tipo: "DOCUMENTO" },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    tipo: "DOCUMENTO",
  },
  xls: { mime: "application/vnd.ms-excel", tipo: "DOCUMENTO" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tipo: "DOCUMENTO" },
  txt: { mime: "text/plain; charset=utf-8", tipo: "DOCUMENTO" },
  csv: { mime: "text/csv; charset=utf-8", tipo: "DOCUMENTO" },
};

// Los adjuntos se guardan tal cual, con un nombre aleatorio: el nombre original queda solo en la base.
export async function guardarAdjunto(solicitudId: number, extension: string, contenido: Buffer) {
  const carpeta = `solicitudes/${solicitudId}/adjuntos`;
  const ruta = `${carpeta}/${randomUUID()}.${extension}`;
  await mkdir(path.join(raizStorage(), carpeta), { recursive: true });
  await writeFile(path.join(raizStorage(), ruta), contenido);
  return { ruta, tamano: contenido.length };
}

export async function borrarArchivo(rutaRelativa: string) {
  const abs = rutaAbsoluta(rutaRelativa);
  if (abs) await unlink(abs).catch(() => {});
}

// Recomprime la foto (máx. 1600 px, JPEG) y genera la miniatura. Lanza si el archivo no es una imagen.
export async function guardarFoto(solicitudId: number, original: Buffer) {
  const carpeta = `solicitudes/${solicitudId}/fotos`;
  const nombre = randomUUID();
  const ruta = `${carpeta}/${nombre}.jpg`;
  const rutaMiniatura = `${carpeta}/${nombre}_min.jpg`;

  // rotate() sin argumentos aplica la orientación EXIF, que si no se pierde al recomprimir.
  const base = sharp(original, { failOn: "error" }).rotate();
  const grande = await base
    .clone()
    .resize({ width: LADO_MAX, height: LADO_MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  const miniatura = await base
    .clone()
    .resize({ width: LADO_MINIATURA, height: LADO_MINIATURA, fit: "cover" })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();

  await mkdir(path.join(raizStorage(), carpeta), { recursive: true });
  await writeFile(path.join(raizStorage(), ruta), grande);
  await writeFile(path.join(raizStorage(), rutaMiniatura), miniatura);

  return { ruta, rutaMiniatura, tamano: grande.length + miniatura.length };
}
