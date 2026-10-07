"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Estado, Rol, Urgencia } from "@prisma/client";
import { COLOR_URGENCIA, ESTADOS, URGENCIAS } from "@/lib/etiquetas";
import { avancesPosibles, evaluarCambio, retrocesosPosibles, type SolicitudFlujo } from "@/lib/estados";
import { cambiarEstado } from "@/server/estados-acciones";
import { DialogoCambioEstado, type CambioPendiente } from "@/components/DialogoCambioEstado";

export type Tarjeta = SolicitudFlujo & {
  id: number;
  numero: string;
  cliente: string;
  descripcion: string;
  urgencia: Urgencia;
  sector: string | null;
  estante: string | null;
  dias: number;
  miniatura: string | null;
};

function destinosDe(t: Tarjeta, rol: Rol): Estado[] {
  return [...avancesPosibles(t, rol), ...retrocesosPosibles(t, rol)];
}

function CuerpoTarjeta({ t }: { t: Tarjeta }) {
  return (
    <>
      <div className="flex items-start gap-2">
        {t.miniatura && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.miniatura}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-bold text-blue-800">{t.numero}</div>
          <div className="truncate text-sm font-semibold">{t.cliente}</div>
        </div>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.descripcion}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {t.enEspera && <span className="chip bg-amber-100 text-amber-800">En espera</span>}
        {(t.urgencia === "ALTA" || t.urgencia === "URGENTE") && (
          <span className={`chip ${COLOR_URGENCIA[t.urgencia]}`}>{URGENCIAS[t.urgencia]}</span>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {t.dias <= 0 ? "hoy" : t.dias === 1 ? "1 día" : `${t.dias} días`}
        </span>
      </div>
    </>
  );
}

function TarjetaArrastrable({ t, movible, onAbrir }: { t: Tarjeta; movible: boolean; onAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: t.id, disabled: !movible });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="link"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => e.key === "Enter" && onAbrir()}
      // touch-action y touch-callout: sin esto el celular hace scroll o abre su menú en vez de arrastrar.
      style={{ touchAction: "manipulation", WebkitTouchCallout: "none" }}
      className={`cursor-pointer rounded-xl border bg-superficie p-3 shadow-sm select-none ${
        t.enEspera ? "border-amber-300" : "border-slate-200"
      } ${isDragging ? "opacity-30" : "hover:border-blue-300"}`}
    >
      <CuerpoTarjeta t={t} />
    </div>
  );
}

function Columna({
  estado,
  nombre,
  color,
  cantidad,
  resaltado,
  children,
}: {
  estado: Estado;
  nombre: string;
  color: string;
  cantidad: number;
  // null: no se está arrastrando nada.
  resaltado: "valida" | "invalida" | "origen" | null;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });
  let borde = "border-transparent";
  if (resaltado === "valida") borde = isOver ? "border-emerald-500 bg-emerald-50" : "border-emerald-300 border-dashed";
  return (
    <section
      ref={setNodeRef}
      aria-label={nombre}
      className={`flex w-72 shrink-0 snap-start flex-col rounded-2xl border-2 bg-slate-200/60 transition ${borde} ${
        resaltado === "invalida" ? "opacity-40" : ""
      }`}
    >
      <header className="flex items-center justify-between gap-2 p-3 pb-2">
        <span className={`chip ${color}`}>{nombre}</span>
        <span className="text-sm font-bold text-slate-500">{cantidad}</span>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2 pt-0">{children}</div>
    </section>
  );
}

export function Tablero({ tarjetas: iniciales, rol }: { tarjetas: Tarjeta[]; rol: Rol }) {
  const router = useRouter();
  const [tarjetas, setTarjetas] = useState(iniciales);
  const [activa, setActiva] = useState<Tarjeta | null>(null);
  const [cambio, setCambio] = useState<CambioPendiente | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => setTarjetas(iniciales), [iniciales]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  // El mouse arrastra al moverse unos píxeles; el dedo, al mantener apretado, para no pelear con el scroll.
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const destinosActiva = useMemo(() => (activa ? destinosDe(activa, rol) : []), [activa, rol]);

  function alEmpezar(e: DragStartEvent) {
    setAviso("");
    setActiva(tarjetas.find((t) => t.id === e.active.id) ?? null);
  }

  async function alSoltar(e: DragEndEvent) {
    const t = activa;
    setActiva(null);
    const destino = e.over?.id as Estado | undefined;
    if (!t || !destino || destino === t.estado) return;

    const ev = evaluarCambio(t, rol, destino);
    if (!ev.ok) return setAviso(ev.error);
    if (ev.requisitos.length > 0) {
      return setCambio({
        solicitudId: t.id,
        numero: t.numero,
        destino,
        tipo: ev.tipo,
        requisitos: ev.requisitos,
        sector: t.sector,
        estante: t.estante,
      });
    }

    // Se mueve en pantalla de inmediato y se deshace si el servidor lo rechaza.
    setTarjetas((ts) => ts.map((x) => (x.id === t.id ? { ...x, estado: destino, dias: 0 } : x)));
    const r = await cambiarEstado(t.id, { destino }).catch(() => null);
    if (!r || !r.ok) {
      setTarjetas((ts) => ts.map((x) => (x.id === t.id ? t : x)));
      setAviso(r?.error ?? "No se pudo conectar con el servidor. Probá de nuevo.");
    }
    router.refresh();
  }

  return (
    <>
      {aviso && (
        <p
          role="alert"
          className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-slate-50 shadow-lg sm:bottom-6"
        >
          {aviso}
        </p>
      )}

      <DndContext sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar} onDragCancel={() => setActiva(null)}>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4">
          {ESTADOS.map((e) => {
            const deColumna = tarjetas.filter((t) => t.estado === e.clave);
            const resaltado = !activa
              ? null
              : activa.estado === e.clave
                ? "origen"
                : destinosActiva.includes(e.clave)
                  ? "valida"
                  : "invalida";
            return (
              <Columna
                key={e.clave}
                estado={e.clave}
                nombre={e.nombre}
                color={e.color}
                cantidad={deColumna.length}
                resaltado={resaltado}
              >
                {deColumna.map((t) => (
                  <TarjetaArrastrable
                    key={t.id}
                    t={t}
                    movible={destinosDe(t, rol).length > 0}
                    onAbrir={() => router.push(`/solicitudes/${t.id}`)}
                  />
                ))}
              </Columna>
            );
          })}
        </div>
        <DragOverlay>
          {activa && (
            <div className="w-68 rotate-2 rounded-xl border border-blue-400 bg-superficie p-3 shadow-xl">
              <CuerpoTarjeta t={activa} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {cambio && (
        <DialogoCambioEstado
          cambio={cambio}
          onCerrar={() => setCambio(null)}
          onHecho={() => {
            setCambio(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
