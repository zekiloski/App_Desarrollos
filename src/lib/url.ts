import { headers } from "next/headers";

// URL base para armar enlaces absolutos (los del QR). Sin APP_URL se usa la dirección con la que se entró.
export async function urlBase() {
  const fija = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (fija) return fija;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
