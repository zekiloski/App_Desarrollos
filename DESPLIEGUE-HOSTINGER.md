# Subir Nuevos Desarrollos a Hostinger

La app es Node.js (Next.js) con MySQL. En Hostinger corre en los planes **Business** o **Cloud** (sección
*Node.js* de hPanel) o en un **VPS**. Los planes Single y Premium no ejecutan Node.js.

Resumen: **1)** crear la base MySQL, **2)** crear la app Node.js, **3)** cargar las variables de entorno,
**4)** compilar y arrancar, **5)** configurar email y tarea diaria.

---

## 1. Crear la base de datos (sí, hace falta)

hPanel → **Bases de datos → Administración de bases de datos MySQL** → *Crear una nueva base de datos*.

- Nombre: `nuevos_desarrollos` (Hostinger le agrega un prefijo: queda `u123456789_nuevos_desarrollos`).
- Usuario: `nd_app` (queda `u123456789_nd_app`) y una contraseña fuerte.
- Anotar los tres datos **con el prefijo**. El servidor es `localhost`.

No hace falta crear tablas a mano: la app las crea sola al compilar (paso 4).

> Si la contraseña tiene símbolos (`@ : / ? # % &`), hay que escribirlos codificados en `DATABASE_URL`
> (`@` → `%40`, `#` → `%23`, `%` → `%25`...). Lo más simple: usar solo letras y números, de 24 o más.

## 2. Crear la app Node.js

hPanel → **Sitios web → Agregar sitio web → Aplicación web Node.js** (o en el dominio/subdominio elegido,
por ejemplo `desarrollos.tudominio.com`).

- **Origen:** el repositorio de GitHub `zekiloski/App_Desarrollos` (rama `main`), o subir un .zip del
  proyecto **sin** `node_modules`, `.next`, `storage` ni `.env`.
- **Versión de Node.js:** 20 o 22.
- **Comando de compilación:** el que viene por defecto (`npm run build`). No necesita la base.
- **Comando de inicio:** `npm start` (por defecto). Al arrancar crea las tablas y el usuario admin.
- **Comando de inicio:** `npm start`

## 3. Variables de entorno

Cargarlas en la configuración de la app en hPanel (no se sube el `.env` de la PC):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `mysql://u123456789_nd_app:CONTRASEÑA@localhost:3306/u123456789_nuevos_desarrollos` |
| `AUTH_SECRET` | Clave larga y aleatoria, **distinta** de la de la PC |
| `ADMIN_PASSWORD` | Contraseña inicial del usuario `admin` (8 caracteres o más) |
| `APP_URL` | `https://desarrollos.tudominio.com` (es la que se graba en los QR) |
| `STORAGE_DIR` | Carpeta **fuera** de la carpeta de la app, ej. `/home/u123456789/nd-storage` |
| `APP_TIMEZONE` | `America/Argentina/Buenos_Aires` |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | La casilla completa, ej. `avisos@tudominio.com` |
| `SMTP_PASS` | Contraseña de esa casilla |
| `SMTP_FROM` | `Nuevos Desarrollos <avisos@tudominio.com>` |
| `CRON_SECRET` | Clave aleatoria para la tarea diaria |

Para generar `AUTH_SECRET` y `CRON_SECRET`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Sobre `STORAGE_DIR`:** ahí quedan las fotos y los planos. Si queda dentro de la carpeta de la app, un
nuevo despliegue puede borrarlos. Usar una ruta absoluta en el home de la cuenta (el `u123456789` es el
usuario que se ve en hPanel → *Detalles de la cuenta* o en el administrador de archivos) y respaldarla.

**Sobre `ADMIN_PASSWORD`:** con esta variable, la compilación crea **solo** el usuario `admin` con esa
contraseña; los usuarios demo (`vendedor`, `tecnica`...) no se crean en el servidor. Si `admin` ya existe,
no se le cambia la contraseña.

## 4. Compilar y arrancar

Al desplegar, `npm run build` prepara el acceso a la base (`prisma generate`) y compila la app. No se
conecta a la base: en Hostinger la compilación puede correr en otra máquina.

Después `npm start`, ya en el servidor, hace en orden:

1. `prisma migrate deploy` — crea las tablas (o aplica las que falten en futuras versiones).
2. Datos iniciales — usuario `admin`, lista de procesos y configuración. No pisa datos existentes.
3. `next start` — arranca la app.

Si la base no responde, la app no arranca y el error queda en los registros de la aplicación. Entrar a la URL con `admin` y la contraseña de `ADMIN_PASSWORD`, y desde
**Admin → Usuarios** crear los usuarios reales.

Cada vez que se suba una versión nueva (push a GitHub o zip nuevo) se repite el mismo proceso, sin perder
datos.

## 5. Email y tarea diaria

- **Email:** crear la casilla en hPanel → **Emails** (ej. `avisos@tudominio.com`) y completar las variables
  `SMTP_*`. En la app, **Admin → Avisos por email** muestra si quedó configurado.
- **Tarea diaria** (resumen de piezas detenidas): hPanel → **Avanzado → Cron Jobs**, una vez por día:

  ```
  curl -s "https://desarrollos.tudominio.com/api/cron/diario?clave=EL_CRON_SECRET" > /dev/null
  ```

## Opcional: pasar los datos de la PC al servidor

Solo si se quieren conservar las solicitudes cargadas en la PC (si no, el servidor arranca vacío):

1. En la PC, exportar la base:
   `mysqldump -u nd_app -p --no-tablespaces nuevos_desarrollos > nuevos_desarrollos.sql`
2. En hPanel → **phpMyAdmin** de la base nueva → *Importar* ese archivo. Hacerlo **antes** del primer
   despliegue (o vaciar la base primero), para que no choque con las tablas que crea la compilación.
3. Subir el contenido de la carpeta `storage/` de la PC a la carpeta de `STORAGE_DIR` con el
   administrador de archivos o por FTP.
4. Los usuarios demo vienen incluidos en esa copia: desactivarlos desde **Admin → Usuarios** y cambiar la
   contraseña de `admin`.

## Si algo falla

- **"Can't reach database server"**: revisar `DATABASE_URL` (prefijos `u123456789_`, contraseña, host
  `localhost`).
- **Las fotos no aparecen después de actualizar**: `STORAGE_DIR` quedó dentro de la carpeta de la app.
- **Los QR apuntan a otra dirección**: corregir `APP_URL` y volver a imprimir las etiquetas.
- Los registros de la app se ven en hPanel, en la sección de la aplicación Node.js.
