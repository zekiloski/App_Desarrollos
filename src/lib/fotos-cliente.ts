// Utilidades de navegador para subir fotos.

const LADO_MAX = 1600;

// Achica la foto antes de subirla para ahorrar datos del celular. Si el navegador no puede
// decodificarla, se envía el original y el servidor se encarga de comprimirla.
export async function reducirImagen(archivo: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob && blob.size < archivo.size ? blob : archivo;
  } catch {
    return archivo;
  }
}

export async function subirFoto(solicitudId: number, archivo: File) {
  const fd = new FormData();
  fd.append("foto", await reducirImagen(archivo), "foto.jpg");
  const r = await fetch(`/api/solicitudes/${solicitudId}/fotos`, { method: "POST", body: fd });
  if (!r.ok) {
    const cuerpo = await r.json().catch(() => null);
    throw new Error(cuerpo?.error ?? "No se pudo subir la foto.");
  }
}
