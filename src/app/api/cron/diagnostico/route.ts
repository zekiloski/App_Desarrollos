import { timingSafeEqual } from "node:crypto";
import { access, constants, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function claveValida(recibida: string | null) {
  const esperada = process.env.CRON_SECRET;
  if (!esperada || !recibida) return false;
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

const VARIABLES = ["DATABASE_URL", "AUTH_SECRET", "APP_URL", "STORAGE_DIR", "APP_TIMEZONE", "SMTP_HOST", "SMTP_USER"];

// Revisión del servidor para cuando la app no abre: qué variables llegaron (sin mostrar sus valores),
// si conecta a la base y si puede escribir en la carpeta de archivos.
//   https://.../api/cron/diagnostico?clave=CRON_SECRET
// Protegida con la misma clave que la tarea diaria. Sin CRON_SECRET configurado, la ruta no existe.
export async function GET(req: Request) {
  if (!claveValida(new URL(req.url).searchParams.get("clave"))) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const variables = Object.fromEntries(VARIABLES.map((v) => [v, process.env[v] ? "cargada" : "FALTA"]));
  const secreto = process.env.AUTH_SECRET ?? "";
  if (secreto && secreto.length < 16) variables.AUTH_SECRET = "demasiado corta (mínimo 16)";

  let baseDeDatos: string;
  try {
    const usuarios = await db.usuario.count();
    baseDeDatos = `ok (${usuarios} usuarios)`;
  } catch (e) {
    baseDeDatos = `ERROR: ${e instanceof Error ? e.message.trim().split("\n").slice(-3).join(" ") : String(e)}`;
  }

  const carpeta = path.resolve(process.env.STORAGE_DIR || "./storage");
  let archivos: string;
  try {
    await mkdir(carpeta, { recursive: true });
    await access(carpeta, constants.W_OK);
    archivos = `ok (${carpeta})`;
  } catch (e) {
    archivos = `ERROR en ${carpeta}: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({
    variables,
    baseDeDatos,
    archivos,
    node: process.version,
    sistema: `${process.platform} ${process.arch}`,
  });
}
