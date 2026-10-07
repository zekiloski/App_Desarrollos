"use client";

import { useActionState, useEffect, useState } from "react";
import type { RequiereMatriz } from "@prisma/client";
import { guardarDatosTecnicos, type EstadoTecnico } from "@/server/tecnico-acciones";

export type DatosTecnicosVista = {
  material: string | null;
  espesor: string | null;
  dimensiones: string | null;
  requiereMatriz: RequiereMatriz;
  matrizObservaciones: string | null;
  matrizCostoEstimado: string | null;
  matrizTiempoEstimadoDias: number | null;
};

const MATRIZ: Record<RequiereMatriz, string> = { SIN_EVALUAR: "Sin evaluar", SI: "Sí, requiere", NO: "No requiere" };
const COLOR_MATRIZ: Record<RequiereMatriz, string> = {
  SIN_EVALUAR: "bg-slate-100 text-slate-700",
  SI: "bg-amber-100 text-amber-800",
  NO: "bg-emerald-100 text-emerald-800",
};

function Dato({ nombre, valor }: { nombre: string; valor: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{nombre}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap">{valor || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

export function DatosTecnicos({
  solicitudId,
  datos,
  puedeEditar,
}: {
  solicitudId: number;
  datos: DatosTecnicosVista;
  puedeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [matriz, setMatriz] = useState<RequiereMatriz>(datos.requiereMatriz);
  const [estado, accion, enviando] = useActionState<EstadoTecnico, FormData>(
    guardarDatosTecnicos.bind(null, solicitudId),
    {},
  );

  useEffect(() => {
    if (estado.guardado) setEditando(false);
  }, [estado.guardado]);

  const costo = datos.matrizCostoEstimado
    ? `$ ${Number(datos.matrizCostoEstimado).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
    : null;

  if (!editando) {
    return (
      <div>
        <dl className="grid grid-cols-2 gap-4">
          <Dato nombre="Material" valor={datos.material} />
          <Dato nombre="Espesor" valor={datos.espesor} />
          <div className="col-span-2">
            <Dato nombre="Dimensiones principales" valor={datos.dimensiones} />
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase">¿Requiere matriz?</dt>
            <dd className="mt-1">
              <span className={`chip ${COLOR_MATRIZ[datos.requiereMatriz]}`}>{MATRIZ[datos.requiereMatriz]}</span>
            </dd>
          </div>
          {datos.requiereMatriz === "SI" && (
            <>
              <Dato nombre="Costo estimado de la matriz" valor={costo} />
              <Dato
                nombre="Tiempo estimado"
                valor={datos.matrizTiempoEstimadoDias !== null ? `${datos.matrizTiempoEstimadoDias} días` : null}
              />
            </>
          )}
          {datos.matrizObservaciones && (
            <div className="col-span-2">
              <Dato nombre="Observaciones de la matriz" valor={datos.matrizObservaciones} />
            </div>
          )}
        </dl>
        {puedeEditar && (
          <button
            type="button"
            className="btn btn-secundario mt-4 w-full sm:w-auto"
            onClick={() => {
              setMatriz(datos.requiereMatriz);
              setEditando(true);
            }}
          >
            Editar datos técnicos
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dt-material" className="etiqueta">
            Material
          </label>
          <input
            id="dt-material"
            name="material"
            className="campo"
            defaultValue={datos.material ?? ""}
            maxLength={150}
            placeholder="Ej: chapa SAE 1010, redondo 1045…"
          />
        </div>
        <div>
          <label htmlFor="dt-espesor" className="etiqueta">
            Espesor
          </label>
          <input
            id="dt-espesor"
            name="espesor"
            className="campo"
            defaultValue={datos.espesor ?? ""}
            maxLength={60}
            placeholder='Ej: 3,2 mm, 1/4"'
          />
        </div>
      </div>
      <div>
        <label htmlFor="dt-dimensiones" className="etiqueta">
          Dimensiones principales
        </label>
        <input
          id="dt-dimensiones"
          name="dimensiones"
          className="campo"
          defaultValue={datos.dimensiones ?? ""}
          maxLength={250}
          placeholder="Ej: 320 × 150 × 45 mm"
        />
      </div>

      <div>
        <span className="etiqueta">¿Requiere matriz?</span>
        <input type="hidden" name="requiereMatriz" value={matriz} />
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="¿Requiere matriz?">
          {(Object.keys(MATRIZ) as RequiereMatriz[]).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={matriz === k}
              onClick={() => setMatriz(k)}
              className={`min-h-12 cursor-pointer rounded-xl border-2 px-2 text-sm font-semibold ${
                matriz === k
                  ? "border-blue-700 bg-blue-50 text-blue-800"
                  : "border-slate-300 bg-superficie text-slate-700"
              }`}
            >
              {MATRIZ[k]}
            </button>
          ))}
        </div>
      </div>

      {matriz === "SI" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dt-costo" className="etiqueta">
              Costo estimado de la matriz ($)
            </label>
            <input
              id="dt-costo"
              name="matrizCostoEstimado"
              className="campo"
              inputMode="decimal"
              defaultValue={datos.matrizCostoEstimado ? datos.matrizCostoEstimado.replace(".", ",") : ""}
            />
          </div>
          <div>
            <label htmlFor="dt-dias" className="etiqueta">
              Tiempo estimado (días)
            </label>
            <input
              id="dt-dias"
              name="matrizTiempoEstimadoDias"
              type="number"
              inputMode="numeric"
              min={0}
              className="campo"
              defaultValue={datos.matrizTiempoEstimadoDias ?? ""}
            />
          </div>
        </div>
      )}
      {matriz !== "SIN_EVALUAR" && (
        <div>
          <label htmlFor="dt-obs" className="etiqueta">
            Observaciones de la matriz
          </label>
          <textarea
            id="dt-obs"
            name="matrizObservaciones"
            rows={2}
            className="campo"
            maxLength={2000}
            defaultValue={datos.matrizObservaciones ?? ""}
          />
        </div>
      )}

      {estado.error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {estado.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secundario flex-1" onClick={() => setEditando(false)} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primario flex-1" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
