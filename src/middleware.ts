import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, leerToken } from "@/lib/token";

// Primer filtro: sin sesión válida no se pasa. Los permisos por rol se validan en cada página y acción.
export async function middleware(req: NextRequest) {
  const uid = await leerToken(req.cookies.get(COOKIE_SESION)?.value);
  if (uid) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  const destino = req.nextUrl.pathname + req.nextUrl.search;
  if (destino !== "/") login.searchParams.set("volver", destino);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|login|api/cron/).*)"],
};
