# Nuevos Desarrollos

Seguimiento de piezas nuevas: desde que el vendedor las ingresa hasta que quedan cargadas en el sistema de producción.

Next.js 15 (App Router) · TypeScript · Prisma · MySQL · Tailwind.

## Puesta en marcha local

1. Copiar `.env.example` a `.env` y completar `DATABASE_URL` (usuario y contraseña de MySQL) y `AUTH_SECRET`.
2. Instalar dependencias: `npm install`
3. Crear la base, las tablas y los datos iniciales: `npm run db:setup`
4. Levantar la app: `npm run dev` y abrir http://localhost:3000

Para probar desde el celular en la misma red wifi: `npm run dev -- -H 0.0.0.0` y abrir `http://IP-DE-LA-PC:3000`.

## Usuarios iniciales

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin1234 | Gerencia / Admin |
| vendedor, vendedor2 | demo1234 | Vendedor |
| recepcion | demo1234 | Encargado / Recepción |
| tecnica | demo1234 | Oficina Técnica |
| produccion | demo1234 | Encargado de Producción |

Antes de salir a producción: cambiar la contraseña de `admin` y desactivar los usuarios demo.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y correr en producción |
| `npm run db:setup` | Aplica migraciones y carga datos iniciales (no pisa datos existentes) |
| `npm run db:migrate` | Crea una migración nueva después de cambiar `prisma/schema.prisma` |
| `npm run typecheck` | Verifica tipos |

## Estructura

- `prisma/` — esquema, migraciones y datos iniciales
- `src/app/` — páginas y rutas de API
- `src/lib/` — sesión, permisos, estados, archivos
- `src/server/` — acciones del servidor (altas y cambios)
- `storage/` — fotos y adjuntos (no se sube a git; hay que respaldarla aparte)
