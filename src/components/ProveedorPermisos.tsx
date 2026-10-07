"use client";

import { establecerPermisos, type MatrizPermisos } from "@/lib/permisos";

// Lleva al navegador los permisos vigentes, para que los botones que se muestran coincidan con lo que
// el servidor va a permitir. Se asigna durante el render, antes de que se dibujen las pantallas hijas.
export function ProveedorPermisos({ matriz, children }: { matriz: MatrizPermisos; children: React.ReactNode }) {
  establecerPermisos(matriz);
  return <>{children}</>;
}
