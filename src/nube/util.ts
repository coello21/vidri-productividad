/** Utilidades para hablar con Supabase. */
/** Mensaje de error corto: si la respuesta llegó cortada, Supabase devuelve el texto crudo (datos), no un mensaje. */
export function msjError(e: { message?: string; code?: string } | null | undefined): string {
  const m = String(e?.message || e?.code || 'error');
  return m.length > 200 || /^\s*[[{"]/.test(m) ? 'la conexión con la base se cortó a medio camino (respuesta incompleta). Vuelve a cargar la página.' : m;
}

export function trozos<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function enParalelo<T>(tareas: (() => Promise<T>)[], limite: number): Promise<T[]> {
  const res: T[] = new Array(tareas.length);
  let i = 0;
  const obrero = async () => { while (i < tareas.length) { const k = i++; res[k] = await tareas[k](); } };
  await Promise.all(Array.from({ length: Math.min(limite, tareas.length) }, obrero));
  return res;
}
