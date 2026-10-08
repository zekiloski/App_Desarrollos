import type { Rol } from "@prisma/client";

export type Accion =
  | "solicitud.crear"
  | "solicitud.verTodas"
  | "fotos.agregar"
  | "material.editar"
  | "comentar"
  | "tablero.ver"
  | "metricas.ver"
  | "ubicacion.editar"
  | "solicitud.espera"
  | "estado.retroceder"
  | "solicitud.cerrar"
  | "solicitud.eliminar"
  | "tecnico.editar"
  | "solicitud.aprobar"
  | "codigo.gestionar"
  | "procesos.catalogo"
  | "admin";

export type MatrizPermisos = Record<Accion, Rol[]>;

// Valores de fábrica. El administrador puede cambiarlos desde Admin → Permisos (ver permisos-db.ts).
export const PERMISOS_POR_DEFECTO: MatrizPermisos = {
  "solicitud.crear": ["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "ADMIN"],
  // Solo el vendedor queda limitado a las suyas: Recepción recibe piezas de cualquier solicitud
  // y Producción participa del análisis y la aprobación.
  "solicitud.verTodas": ["RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "fotos.agregar": ["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  // Material, espesor y dimensiones: lo que el vendedor ya sabe de la pieza. La matriz, los procesos
  // y los planos son de "tecnico.editar".
  "material.editar": ["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  comentar: ["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "tablero.ver": ["RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "metricas.ver": ["ADMIN"],
  "ubicacion.editar": ["RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "solicitud.espera": ["RECEPCION", "OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "estado.retroceder": ["OFICINA_TECNICA", "ADMIN"],
  "solicitud.cerrar": ["RECEPCION", "OFICINA_TECNICA", "ADMIN"],
  // Borra la solicitud con todo su historial y archivos: de fábrica, solo el administrador.
  "solicitud.eliminar": ["ADMIN"],
  "tecnico.editar": ["OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "solicitud.aprobar": ["OFICINA_TECNICA", "PRODUCCION", "ADMIN"],
  "codigo.gestionar": ["OFICINA_TECNICA", "ADMIN"],
  "procesos.catalogo": ["OFICINA_TECNICA", "ADMIN"],
  // Usuarios, permisos, avisos y configuración: siempre exclusivo del administrador.
  admin: ["ADMIN"],
};

export const ROLES_CONFIGURABLES: Rol[] = ["VENDEDOR", "RECEPCION", "OFICINA_TECNICA", "PRODUCCION"];

// Cómo se muestra cada permiso en la pantalla de administración. "admin" no figura: no es configurable.
export const GRUPOS_PERMISOS: { titulo: string; permisos: { accion: Accion; nombre: string; detalle?: string }[] }[] = [
  {
    titulo: "Solicitudes",
    permisos: [
      { accion: "solicitud.crear", nombre: "Cargar solicitudes nuevas" },
      {
        accion: "solicitud.verTodas",
        nombre: "Ver las solicitudes de todos",
        detalle: "Sin este permiso ve solo las que cargó o las que trajo como vendedor.",
      },
      { accion: "fotos.agregar", nombre: "Agregar fotos a una solicitud" },
      {
        accion: "material.editar",
        nombre: "Cargar material, espesor y dimensiones",
        detalle: "No incluye la matriz, los procesos ni los planos.",
      },
      { accion: "comentar", nombre: "Escribir comentarios" },
      {
        accion: "solicitud.eliminar",
        nombre: "Eliminar solicitudes",
        detalle: "Borra también fotos, planos, comentarios e historial. No se puede deshacer.",
      },
    ],
  },
  {
    titulo: "Pantallas",
    permisos: [
      { accion: "tablero.ver", nombre: "Ver el tablero" },
      { accion: "metricas.ver", nombre: "Ver las métricas" },
    ],
  },
  {
    titulo: "Seguimiento en planta",
    permisos: [
      {
        accion: "ubicacion.editar",
        nombre: "Recibir piezas y registrar su ubicación",
        detalle: "Incluye imprimir la etiqueta con QR.",
      },
      { accion: "solicitud.espera", nombre: "Poner en espera y retomar" },
      { accion: "estado.retroceder", nombre: "Volver una solicitud a una etapa anterior" },
      { accion: "solicitud.cerrar", nombre: "Cerrar / devolver al cliente" },
    ],
  },
  {
    titulo: "Trabajo técnico",
    permisos: [
      {
        accion: "tecnico.editar",
        nombre: "Evaluar la matriz y cargar procesos y planos",
        detalle: "Incluye avanzar por análisis, mediciones, procesos y evaluación de matriz.",
      },
      { accion: "solicitud.aprobar", nombre: "Aprobar o rechazar" },
      {
        accion: "codigo.gestionar",
        nombre: "Cargar el código de pieza y exportar a producción",
        detalle: "Incluye marcar la pieza como cargada en el sistema de producción.",
      },
      { accion: "procesos.catalogo", nombre: "Editar la lista de procesos" },
    ],
  },
];

// La matriz vigente vive en memoria para poder consultarla sin esperar, tanto en el servidor
// (la carga cargarPermisos() en cada pedido) como en el navegador (la recibe ProveedorPermisos).
// El servidor es el que manda: lo del navegador solo decide qué botones mostrar.
let vigente: MatrizPermisos = PERMISOS_POR_DEFECTO;

export function establecerPermisos(matriz: MatrizPermisos) {
  vigente = matriz;
}

export function puede(rol: Rol, accion: Accion) {
  // El administrador nunca pierde un permiso, pase lo que pase con la configuración.
  return rol === "ADMIN" || (vigente[accion] ?? PERMISOS_POR_DEFECTO[accion]).includes(rol);
}
