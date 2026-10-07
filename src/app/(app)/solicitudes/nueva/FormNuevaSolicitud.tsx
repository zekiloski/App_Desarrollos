"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { crearSolicitud } from "@/server/solicitudes-acciones";
import { subirFoto } from "@/lib/fotos-cliente";
import { TIPOS_INGRESO, URGENCIAS } from "@/lib/etiquetas";
import { BotonesFoto } from "@/components/BotonesFoto";

type ClienteOpcion = { nombre: string; contacto: string | null; telefono: string | null; localidad: string | null };
type FotoPendiente = { clave: string; archivo: File; vista: string };

const MAX_FOTOS = 12;

export function FormNuevaSolicitud({
  clientes,
  vendedores,
  esVendedor,
  conMaterial,
  yo,
}: {
  conMaterial: boolean;
  clientes: ClienteOpcion[];
  vendedores: { id: number; nombre: string }[];
  esVendedor: boolean;
  yo: { id: number; nombre: string };
}) {
  const router = useRouter();
  const [tipoIngreso, setTipoIngreso] = useState("");
  const [urgencia, setUrgencia] = useState("NORMAL");
  const [cliente, setCliente] = useState({ nombre: "", contacto: "", telefono: "", localidad: "" });
  const [fotos, setFotos] = useState<FotoPendiente[]>([]);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [progreso, setProgreso] = useState("");
  const enviando = progreso !== "";
  const contador = useRef(0);

  // Libera las vistas previas al salir de la pantalla.
  const fotosRef = useRef(fotos);
  fotosRef.current = fotos;
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.vista)), []);

  const clienteConocido = clientes.find((c) => c.nombre.toLowerCase() === cliente.nombre.trim().toLowerCase());

  function alCambiarCliente(nombre: string) {
    const c = clientes.find((x) => x.nombre.toLowerCase() === nombre.trim().toLowerCase());
    // Al elegir un cliente de la lista se traen sus datos ya cargados.
    setCliente(
      c
        ? { nombre, contacto: c.contacto ?? "", telefono: c.telefono ?? "", localidad: c.localidad ?? "" }
        : { ...cliente, nombre },
    );
  }

  function agregarFotos(archivos: File[]) {
    const lugar = MAX_FOTOS - fotos.length;
    const nuevas = archivos
      .filter((a) => a.type.startsWith("image/"))
      .slice(0, lugar)
      // crypto.randomUUID no existe fuera de HTTPS (p. ej. probando desde el celular por IP local).
      .map((archivo) => ({ clave: `f${++contador.current}`, archivo, vista: URL.createObjectURL(archivo) }));
    setFotos([...fotos, ...nuevas]);
  }

  function quitarFoto(clave: string) {
    const f = fotos.find((x) => x.clave === clave);
    if (f) URL.revokeObjectURL(f.vista);
    setFotos(fotos.filter((x) => x.clave !== clave));
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    setError("");
    setCampos({});

    if ((tipoIngreso === "FOTOS" || tipoIngreso === "AMBAS") && fotos.length === 0) {
      setError("Agregá al menos una foto de la pieza.");
      return;
    }

    setProgreso("Guardando solicitud…");
    const r = await crearSolicitud(new FormData(e.currentTarget)).catch(() => null);
    if (!r || !r.ok) {
      setError(r?.error ?? "No se pudo conectar con el servidor. Revisá la conexión y probá de nuevo.");
      setCampos(r?.campos ?? {});
      setProgreso("");
      return;
    }

    // La solicitud ya existe: si alguna foto falla, se avisa en la ficha y se puede volver a subir desde ahí.
    let fallidas = 0;
    for (let i = 0; i < fotos.length; i++) {
      setProgreso(`Subiendo foto ${i + 1} de ${fotos.length}…`);
      try {
        await subirFoto(r.id, fotos[i].archivo);
      } catch {
        fallidas++;
      }
    }
    router.push(`/solicitudes/${r.id}${fallidas ? `?fotosFallidas=${fallidas}` : ""}`);
  }

  const claseCampo = (k: string) => `campo ${campos[k] ? "campo-error" : ""}`;
  const errorDe = (k: string) =>
    campos[k] ? <p className="mt-1 text-sm font-medium text-red-600">{campos[k]}</p> : null;

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <section className="tarjeta space-y-4">
        <h2 className="titulo-seccion">Cliente</h2>
        <div>
          <label htmlFor="clienteNombre" className="etiqueta">
            Nombre del cliente *
          </label>
          <input
            id="clienteNombre"
            name="clienteNombre"
            list="lista-clientes"
            className={claseCampo("clienteNombre")}
            value={cliente.nombre}
            onChange={(e) => alCambiarCliente(e.target.value)}
            placeholder="Escribí para buscar o cargá uno nuevo"
            autoComplete="off"
          />
          <datalist id="lista-clientes">
            {clientes.map((c) => (
              <option key={c.nombre} value={c.nombre}>
                {c.localidad ?? ""}
              </option>
            ))}
          </datalist>
          {errorDe("clienteNombre")}
          {cliente.nombre.trim().length >= 2 && (
            <p className="mt-1 text-sm text-slate-500">
              {clienteConocido ? "Cliente ya registrado." : "Cliente nuevo: se guarda para la próxima vez."}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="clienteContacto" className="etiqueta">
              Contacto
            </label>
            <input
              id="clienteContacto"
              name="clienteContacto"
              className="campo"
              value={cliente.contacto}
              onChange={(e) => setCliente({ ...cliente, contacto: e.target.value })}
              placeholder="Persona de contacto"
            />
          </div>
          <div>
            <label htmlFor="clienteTelefono" className="etiqueta">
              Teléfono
            </label>
            <input
              id="clienteTelefono"
              name="clienteTelefono"
              type="tel"
              className="campo"
              value={cliente.telefono}
              onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="clienteLocalidad" className="etiqueta">
            Localidad
          </label>
          <input
            id="clienteLocalidad"
            name="clienteLocalidad"
            className="campo"
            value={cliente.localidad}
            onChange={(e) => setCliente({ ...cliente, localidad: e.target.value })}
          />
        </div>
        {!esVendedor && (
          <div>
            <label htmlFor="vendedorId" className="etiqueta">
              Vendedor que la trajo *
            </label>
            <select id="vendedorId" name="vendedorId" className={claseCampo("vendedorId")} defaultValue={yo.id}>
              <option value={yo.id}>{yo.nombre} (yo)</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>
            {errorDe("vendedorId")}
          </div>
        )}
      </section>

      <section className="tarjeta space-y-4">
        <h2 className="titulo-seccion">Pieza</h2>
        <div>
          <span className="etiqueta">¿Cómo ingresó? *</span>
          <input type="hidden" name="tipoIngreso" value={tipoIngreso} />
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de ingreso">
            {Object.entries(TIPOS_INGRESO).map(([clave, nombre]) => (
              <button
                key={clave}
                type="button"
                role="radio"
                aria-checked={tipoIngreso === clave}
                onClick={() => setTipoIngreso(clave)}
                className={`min-h-14 cursor-pointer rounded-xl border-2 px-2 text-sm font-semibold ${
                  tipoIngreso === clave
                    ? "border-blue-700 bg-blue-50 text-blue-800"
                    : "border-slate-300 bg-superficie text-slate-700"
                }`}
              >
                {nombre}
              </button>
            ))}
          </div>
          {errorDe("tipoIngreso")}
        </div>
        <div>
          <label htmlFor="descripcion" className="etiqueta">
            Descripción *
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={4}
            className={claseCampo("descripcion")}
            placeholder="Qué pieza es, para qué sirve, qué pidió el cliente…"
          />
          {errorDe("descripcion")}
        </div>
        <div>
          <label htmlFor="implemento" className="etiqueta">
            Implemento / máquina donde va
          </label>
          <input id="implemento" name="implemento" className="campo" placeholder="Ej: sembradora, tolva, acoplado…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cantidadEstimada" className="etiqueta">
              Cantidad estimada
            </label>
            <input
              id="cantidadEstimada"
              name="cantidadEstimada"
              type="number"
              inputMode="numeric"
              min={1}
              className={claseCampo("cantidadEstimada")}
            />
            {errorDe("cantidadEstimada")}
          </div>
          <div>
            <span className="etiqueta">Urgencia</span>
            <input type="hidden" name="urgencia" value={urgencia} />
            <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Urgencia">
              {Object.entries(URGENCIAS).map(([clave, nombre]) => (
                <button
                  key={clave}
                  type="button"
                  role="radio"
                  aria-checked={urgencia === clave}
                  onClick={() => setUrgencia(clave)}
                  className={`min-h-12 cursor-pointer rounded-xl border-2 text-sm font-semibold ${
                    urgencia === clave
                      ? "border-blue-700 bg-blue-50 text-blue-800"
                      : "border-slate-300 bg-superficie text-slate-700"
                  }`}
                >
                  {nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {conMaterial && (
        <section className="tarjeta space-y-4">
          <div>
            <h2 className="titulo-seccion mb-1!">Material y medidas</h2>
            <p className="text-sm text-slate-500">Opcional: completá lo que sepas. Se puede cargar o corregir después.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="material" className="etiqueta">
                Material
              </label>
              <input id="material" name="material" className="campo" maxLength={150} placeholder="Ej: chapa SAE 1010" />
            </div>
            <div>
              <label htmlFor="espesor" className="etiqueta">
                Espesor
              </label>
              <input id="espesor" name="espesor" className="campo" maxLength={60} placeholder="Ej: 3,2 mm" />
            </div>
          </div>
          <div>
            <label htmlFor="dimensiones" className="etiqueta">
              Dimensiones principales
            </label>
            <input
              id="dimensiones"
              name="dimensiones"
              className="campo"
              maxLength={250}
              placeholder="Ej: 320 × 150 × 45 mm"
            />
          </div>
        </section>
      )}

      <section className="tarjeta space-y-3">
        <h2 className="titulo-seccion">
          Fotos ({fotos.length}/{MAX_FOTOS})
        </h2>
        {fotos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fotos.map((f) => (
              <li key={f.clave} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.vista} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => quitarFoto(f.clave)}
                  disabled={enviando}
                  aria-label="Quitar foto"
                  className="absolute top-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/70 text-lg font-bold text-white"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <BotonesFoto onArchivos={agregarFotos} deshabilitado={enviando || fotos.length >= MAX_FOTOS} />
        <p className="text-sm text-slate-500">Se achican automáticamente antes de subirlas.</p>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primario w-full" disabled={enviando}>
        {enviando ? progreso : "Guardar solicitud"}
      </button>
    </form>
  );
}
