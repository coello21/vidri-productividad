/**
 * Productividad en Supabase: tablas prod_ordenes (una fila por orden, todas las columnas del reporte)
 * y prod_personal (personas agregadas al listado desde la página).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Orden, FilaAuditoria, Extra } from '../core/productividad/parseo';
import type { Persona } from '../core/productividad/listado';
import { clave } from '../core/productividad/listado';
import { trozos, enParalelo, msjError } from './util';

export interface FilaOrden extends Extra {
  id: number; preparador: string; items: number; horas: number | null; tipo: string | null; dia: string; zona: string | null; t1: number | null; t2: number | null;
}
/** Columnas que necesita la pantalla (las demás quedan en la base para el análisis de picking). */
const COLS_PANTALLA = 'id,preparador,items,horas,tipo,dia,zona,t1,t2';

export const aOrden = (r: Pick<FilaOrden, 'id' | 'preparador' | 'items' | 'horas' | 'tipo' | 'dia' | 'zona' | 't1' | 't2'>): Orden =>
  [Number(r.id), r.preparador, r.items || 0, r.horas == null ? 0 : Number(r.horas), r.tipo || '', r.dia, r.zona || '', r.t1 == null ? null : Number(r.t1), r.t2 == null ? null : Number(r.t2)];
export const aFila = (f: FilaAuditoria): FilaOrden => {
  const o = f.orden;
  return { id: o[0], preparador: o[1], items: o[2], horas: o[3], tipo: o[4] || null, dia: o[5], zona: o[6] || null, t1: o[7], t2: o[8], ...f.extra };
};
/** Órdenes del historial viejo (.json): solo las columnas de la pantalla. */
export const filaDeOrden = (o: Orden): Partial<FilaOrden> & { id: number } =>
  ({ id: o[0], preparador: o[1], items: o[2], horas: o[3], tipo: o[4] || null, dia: o[5], zona: o[6] || null, t1: o[7], t2: o[8] });

function revisar<T extends { error: { message?: string } | null }>(r: T, que: string): T {
  if (r.error) throw new Error(que + ': ' + msjError(r.error));
  return r;
}

export class BaseProductividad {
  constructor(private sb: SupabaseClient) {}

  /**
   * Órdenes desde un día (o todas). Se leen por meses, varios a la vez; dentro de cada mes en páginas de 1,000
   * que siguen desde la última orden leída (no "saltar N filas", que con todo el historial pasa del tiempo límite).
   */
  async leerOrdenes(desde: string | null, progreso?: (pct: number) => void): Promise<Orden[]> {
    const filtro = <Q extends { gte: (c: string, v: string) => Q }>(q: Q) => (desde ? q.gte('dia', desde) : q);
    const c = revisar(await filtro(this.sb.from('prod_ordenes').select('id', { count: 'exact', head: true })), 'Productividad');
    const total = c.count || 0;
    let ini = desde;
    if (!ini) {
      const r = revisar(await this.sb.from('prod_ordenes').select('dia').order('dia').limit(1), 'Productividad');
      ini = ((r.data || []) as { dia: string }[])[0]?.dia || null;
    }
    if (!ini) return [];
    // tramos de un mes: [desde, hasta)
    const tramos: [string, string][] = [];
    const hoy = new Date(), fin = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() + 1, 1));
    let d = new Date(ini + 'T00:00:00Z');
    while (d < fin) {
      const sig = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      tramos.push([d.toISOString().slice(0, 10), sig.toISOString().slice(0, 10)]);
      d = sig;
    }
    tramos[tramos.length - 1][1] = '9999-12-31';
    const tam = 1000;
    let leidas = 0;
    const tareas = tramos.map(([a, b]) => async () => {
      const out: Orden[] = [];
      let ultimo = -1;
      for (;;) {
        const r = revisar(await this.sb.from('prod_ordenes').select(COLS_PANTALLA).gte('dia', a).lt('dia', b).gt('id', ultimo).order('id').limit(tam), 'Productividad');
        const filas = (r.data || []) as unknown as FilaOrden[];
        filas.forEach((f) => out.push(aOrden(f)));
        leidas += filas.length; progreso?.(total ? Math.min(100, Math.round(leidas / total * 100)) : 100);
        if (filas.length < tam) break;
        ultimo = Number(filas[filas.length - 1].id);
      }
      return out;
    });
    return (await enParalelo(tareas, 4)).flat().sort((x, y) => x[0] - y[0]);   // mismo orden que antes (por id)
  }
  /** Cuándo se guardó la última orden (la última carga del Excel). */
  async ultimaActualizacion(): Promise<string | null> {
    const r = revisar(await this.sb.from('prod_ordenes').select('actualizado').not('actualizado', 'is', null).order('actualizado', { ascending: false }).limit(1), 'Productividad');
    return ((r.data || []) as { actualizado: string }[])[0]?.actualizado || null;
  }
  async leerPersonal(): Promise<Persona[]> {
    const r = revisar(await this.sb.from('prod_personal').select('codigo,nombre,tipo,estado').order('agregado'), 'Listado');
    return ((r.data || []) as { codigo: number | null; nombre: string; tipo: string; estado: string }[]).map((x) => [x.codigo, x.nombre, x.tipo, x.estado]);
  }
  async guardarOrdenes(filas: (Partial<FilaOrden> & { id: number })[]) {
    await enParalelo(trozos(filas, 500).map((t) => async () => { revisar(await this.sb.from('prod_ordenes').upsert(t, { onConflict: 'id' }), 'Guardar órdenes'); }), 4);
  }
  /** Historial viejo: agrega solo las órdenes que no estén (no pisa las que ya tienen todas las columnas). */
  async agregarSiFaltan(filas: (Partial<FilaOrden> & { id: number })[]) {
    await enParalelo(trozos(filas, 500).map((t) => async () => { revisar(await this.sb.from('prod_ordenes').upsert(t, { onConflict: 'id', ignoreDuplicates: true }), 'Guardar historial'); }), 4);
  }
  async agregarPersona(p: Persona) {
    revisar(await this.sb.from('prod_personal').upsert({ clave: clave(p[1]), codigo: p[0], nombre: p[1], tipo: p[2], estado: p[3] }, { onConflict: 'clave' }), 'Guardar listado');
  }
  async quitarPersona(nombre: string) {
    revisar(await this.sb.from('prod_personal').delete().eq('clave', clave(nombre)), 'Guardar listado');
  }
  async registrarCarga(detalle: unknown) {
    try { await this.sb.from('cargas').insert({ origen: 'productividad', detalle }); } catch { /* la bitácora no es crítica */ }
  }
}
