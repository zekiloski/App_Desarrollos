// Verifica el formato de la exportación a producción. Uso: npx tsx scripts/probar-exportacion.ts
import ExcelJS from "exceljs";
import { generarCsv, generarExcel, type PiezaExportable } from "../src/lib/exportacion";

const pieza: PiezaExportable = {
  numero: "ND-2026-0001",
  codigo: "00123-A",
  descripcion: 'Soporte "reforzado"; con punto y coma\ny salto de línea',
  material: "Chapa SAE 1010",
  espesor: "3,2 mm",
  dimensiones: "320 × 150 × 45 mm",
  cantidad: 200,
  cliente: "Agro Ñandú",
  requiereMatriz: "No",
  procesos: [
    { orden: 1, nombre: "Corte láser", observaciones: "" },
    { orden: 2, nombre: "Plegado", observaciones: "" },
    { orden: 3, nombre: "Pintura", observaciones: "" },
  ],
};

let fallas = 0;
const esperar = (nombre: string, ok: boolean) => {
  if (!ok) fallas++;
  console.log(ok ? "ok   " : "FALLA", nombre);
};

const csv = generarCsv([pieza]);
const lineas = csv.split("\r\n");
esperar("CSV empieza con BOM", csv.charCodeAt(0) === 0xfeff);
esperar("CSV encabezado", lineas[0] === "﻿codigo;descripcion;material;espesor;dimensiones;orden;proceso");
esperar("CSV escapa comillas, ; y saltos", csv.includes('"Soporte ""reforzado""; con punto y coma\ny salto de línea"'));
esperar("CSV una fila por proceso, en orden", csv.includes(";1;Corte láser\r\n") && csv.includes(";3;Pintura\r\n"));
esperar("CSV sin procesos deja una fila", generarCsv([{ ...pieza, procesos: [] }]).split("\r\n").length === 3);

async function main() {
const libro = new ExcelJS.Workbook();
// El tipo Buffer de exceljs es anterior al de Node actual; en ejecución es el mismo objeto.
await libro.xlsx.load((await generarExcel([pieza])) as never);
const hPieza = libro.getWorksheet("Pieza")!;
const hProc = libro.getWorksheet("Procesos")!;
esperar("Excel hoja Pieza: código como texto", hPieza.getCell("A2").value === "00123-A");
esperar("Excel procesos en una celda, en orden", hPieza.getCell("F2").value === "Corte láser > Plegado > Pintura");
esperar("Excel hoja Procesos: 3 filas", hProc.rowCount === 4 && hProc.getCell("C4").value === "Pintura" && hProc.getCell("B4").value === 3);

console.log(fallas ? `\n${fallas} FALLAS` : "\nExportación OK");
process.exit(fallas ? 1 : 0);
}

main();
