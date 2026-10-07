import nodemailer, { type Transporter } from "nodemailer";
import type { Canal } from "./index";

let transporte: Transporter | null = null;

export function emailConfigurado() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function obtenerTransporte() {
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT) || 465;
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporte;
}

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const canalEmail: Canal = {
  configurado: emailConfigurado,
  async enviar(destino, asunto, cuerpo) {
    if (!destino.email) throw new Error("El usuario no tiene email.");
    // Los enlaces del texto se vuelven clicables en la versión HTML.
    const html = escapar(cuerpo)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
      .replace(/\n/g, "<br>");
    await obtenerTransporte().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: destino.email,
      subject: asunto,
      text: cuerpo,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${html}</div>`,
    });
  },
};
