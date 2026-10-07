const ZONA = process.env.APP_TIMEZONE || "America/Argentina/Buenos_Aires";

const fmtFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const fmtFechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function fecha(d: Date) {
  return fmtFecha.format(d);
}

export function fechaHora(d: Date) {
  return fmtFechaHora.format(d);
}

export function diasDesde(d: Date) {
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// Duración legible: horas si es menos de un día, días con un decimal si es más.
export function duracion(ms: number) {
  const horas = ms / 3_600_000;
  if (horas < 1) return "menos de 1 h";
  if (horas < 24) return `${Math.round(horas)} h`;
  const dias = horas / 24;
  return `${dias.toLocaleString("es-AR", { maximumFractionDigits: 1 })} ${dias === 1 ? "día" : "días"}`;
}

export function tamanoLegible(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}

export function hace(d: Date) {
  const dias = diasDesde(d);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  return `hace ${dias} días`;
}
