import ExcelJS from "exceljs";

// Datos de una pieza tal como se cargan en el sistema de producción.
export type PiezaExportable = {
  numero: string;
  codigo: string;
  descripcion: string;
  material: string;
  espesor: string;
  dimensiones: string;
  cantidad: number | null;
  cliente: string;
  requiereMatriz: string;
  procesos: { orden: number; nombre: string; observaciones: string }[];
};

const COLUMNAS_PIEZA = ["Codigo", "Descripcion", "Material", "Espesor", "Dimensiones", "Procesos", "Requiere matriz", "Solicitud", "Cliente", "Cantidad estimada"];
const COLUMNAS_PROCESO = ["Codigo", "Orden", "Proceso", "Observaciones"];
const COLUMNAS_CSV = ["codigo", "descripcion", "material", "espesor", "dimensiones", "orden", "proceso"];

function filaPieza(p: PiezaExportable) {
  return [
    p.codigo,
    p.descripcion,
    p.material,
    p.espesor,
    p.dimensiones,
    p.procesos.map((x) => x.nombre).join(" > "),
    p.requiereMatriz,
    p.numero,
    p.cliente,
    p.cantidad ?? "",
  ];
}

// Dos hojas: "Pieza" (una fila por pieza) y "Procesos" (una fila por proceso, en orden de fabricación).
export async function generarExcel(piezas: PiezaExportable[]) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Nuevos Desarrollos";
  libro.created = new Date();

  const hojaPieza = libro.addWorksheet("Pieza");
  hojaPieza.addRow(COLUMNAS_PIEZA);
  const hojaProcesos = libro.addWorksheet("Procesos");
  hojaProcesos.addRow(COLUMNAS_PROCESO);

  for (const p of piezas) {
    hojaPieza.addRow(filaPieza(p));
    for (const x of p.procesos) hojaProcesos.addRow([p.codigo, x.orden, x.nombre, x.observaciones]);
  }

  for (const hoja of [hojaPieza, hojaProcesos]) {
    hoja.getRow(1).font = { bold: true };
    hoja.views = [{ state: "frozen", ySplit: 1 }];
    hoja.columns.forEach((c) => {
      let ancho = 10;
      c.eachCell?.({ includeEmpty: false }, (celda) => {
        ancho = Math.max(ancho, Math.min(60, String(celda.value ?? "").length + 2));
      });
      c.width = ancho;
    });
    // El código es texto aunque parezca número: así Excel no le quita ceros a la izquierda.
    hoja.getColumn(1).numFmt = "@";
  }

  return Buffer.from(await libro.xlsx.writeBuffer());
}

// Listado general: una hoja con encabezados fijos, filtro automático y fechas como fechas de Excel.
export async function generarExcelListado(columnas: string[], filas: (string | number | Date | null)[][]) {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Nuevos Desarrollos";
  libro.created = new Date();

  const hoja = libro.addWorksheet("Solicitudes");
  hoja.addRow(columnas);
  for (const f of filas) hoja.addRow(f);

  hoja.getRow(1).font = { bold: true };
  hoja.views = [{ state: "frozen", ySplit: 1 }];
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  hoja.columns.forEach((c, i) => {
    const conFecha = filas.some((f) => f[i] instanceof Date);
    if (conFecha) c.numFmt = "dd/mm/yyyy hh:mm";
    let ancho = columnas[i].length + 2;
    for (const f of filas) {
      const v = f[i];
      ancho = Math.max(ancho, Math.min(50, v instanceof Date ? 17 : String(v ?? "").length + 2));
    }
    c.width = ancho;
  });

  return Buffer.from(await libro.xlsx.writeBuffer());
}

function celdaCsv(v: string | number) {
  const t = String(v);
  return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

// Una fila por proceso, repitiendo los datos de la pieza: es el formato más simple de importar.
// Separador ";" y BOM UTF-8, que es lo que abre bien Excel con configuración regional de Argentina.
export function generarCsv(piezas: PiezaExportable[]) {
  const filas: (string | number)[][] = [COLUMNAS_CSV];
  for (const p of piezas) {
    const base = [p.codigo, p.descripcion, p.material, p.espesor, p.dimensiones];
    if (p.procesos.length === 0) filas.push([...base, "", ""]);
    for (const x of p.procesos) filas.push([...base, x.orden, x.nombre]);
  }
  return "﻿" + filas.map((f) => f.map(celdaCsv).join(";")).join("\r\n") + "\r\n";
}
