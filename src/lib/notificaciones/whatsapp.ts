import type { Canal } from "./index";

// Canal preparado para más adelante. Para activarlo hay que:
//   1. Contratar un proveedor (WhatsApp Business Cloud API de Meta, Twilio, etc.).
//   2. Implementar enviar() con la llamada a su API, usando destino.telefono.
//   3. Hacer que configurado() devuelva true cuando estén sus credenciales en .env.
//   4. Crear las notificaciones con canal "WHATSAPP" (ver crearAvisos en index.ts).
// El teléfono de cada usuario ya se guarda en su ficha.
export const canalWhatsapp: Canal = {
  configurado: () => false,
  async enviar() {
    throw new Error("El canal de WhatsApp todavía no está implementado.");
  },
};
