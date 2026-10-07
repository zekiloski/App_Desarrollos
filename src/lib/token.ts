// Se importan los subpaths para no arrastrar al middleware partes de jose que no corren en Edge.
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

// Sin dependencias de Node ni de la base: lo usa también el middleware.

export const COOKIE_SESION = "nd_sesion";
export const DURACION_SESION_SEG = 60 * 60 * 24 * 30;

function clave() {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto || secreto.length < 16) {
    throw new Error("Falta AUTH_SECRET (mínimo 16 caracteres) en el archivo .env");
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarToken(uid: number) {
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(clave());
}

export async function leerToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    return typeof payload.uid === "number" ? payload.uid : null;
  } catch {
    return null;
  }
}
