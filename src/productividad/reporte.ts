/**
 * Reporte ejecutivo de Productividad por zona (una página, para guardar en PDF).
 * Mismo formato que el "Resumen · Productividad por zona" del reporte ejecutivo del Radar:
 * todas las órdenes del día, las de varias zonas aparte, total por zona contra su meta.
 */
import { Productividad, horas } from '../core/productividad/calculo';
import { GLOBAL } from '../core/productividad/listado';

const DIA = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEPT', 'OCT', 'NOV', 'DIC'];
const c1 = (v: number | null | undefined) => (v == null || !isFinite(v) ? '–' : v.toFixed(1).replace('.', ','));
const c0 = (v: number) => Math.round(v).toLocaleString('en-US');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const COL = { g: '#2E7D4F', y: '#C46A1E', r: '#C0392B' } as const;
const est = (v: number, m: number, t: number): keyof typeof COL => (v >= m ? 'g' : v >= m - t ? 'y' : 'r');
const hora = (seg: number) => { const d = new Date(seg * 1000); let h = d.getHours(); const ap = h < 12 ? 'a. m.' : 'p. m.'; h = h % 12 || 12; return h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap; };

/** Último día con órdenes (o el elegido si el rango es un solo día). */
export function diaDelReporte(P: Productividad, d1: string, d2: string): string | null {
  if (d1 && d1 === d2) return d1;
  let max = '';
  for (const o of P.db.values()) if (o[5] > max && (!d2 || o[5] <= d2)) max = o[5];
  return max || null;
}

export function armarReporte(P: Productividad, dia: string, logo: string): { html: string; titulo: string } {
  const Z = P.vistaZonas({ sec: 'zon', flt: 'all', d1: dia, d2: dia, zsel: '', zAll: true });
  let corte = 0;
  for (const o of P.db.values()) if (o[5] === dia && o[8] != null && o[8] > corte) corte = o[8];
  let vo = 0, vk = 0, vh = 0, vp = 0;
  for (const p of Z.personas) { const c = p.z['Varias zonas']; if (c) { vo += c.o; vk += c.k; vh += horas(c); vp++; } }
  const vr = vh ? vk / vh : null;
  const S = Z.S.filter((s) => s.tot != null);
  const en = S.filter((s) => s.tot! >= s.mt.m), bajo = S.filter((s) => s.tot! < s.mt.m);
  const sobre = en.filter((s) => s.h >= 3).sort((a, b) => b.tot! / b.mt.m - a.tot! / a.mt.m).slice(0, 3);
  const rZ = Z.rZ ?? 0, meta = GLOBAL.m, gap = meta - rZ;
  const f = new Date(dia + 'T12:00:00'), fecha = DIA[f.getDay()] + ' ' + f.getDate() + ' ' + MES[f.getMonth()] + ' ' + f.getFullYear();
  const hc = corte ? hora(corte) : '—';
  const bueno = sobre.map((s) => `${s.z}: ${c1(s.tot)} (meta ${s.mt.m}).`);
  const mejorar = bajo.slice().sort((a, b) => b.h - a.h).slice(0, 3).map((s) => `${s.z}: ${c1(s.tot)} (meta ${s.mt.m}).`);
  // escala de las barras sin las zonas con muy pocas horas (un valor extremo aplastaría las demás); lo que se pasa se recorta al 100%
  const mx = Math.max(...S.filter((s) => s.h >= 0.5).map((s) => Math.max(s.tot!, s.mt.m)), ...S.map((s) => s.mt.m)) * 1.05;
  let filas = '';
  for (const s of S) {
    const k = est(s.tot!, s.mt.m, s.mt.t), ka = est(s.avg ?? 0, s.mt.m, s.mt.t);
    filas += `<tr><td class="l"><b>${esc(s.z)}</b></td><td>${s.o}</td><td>${c0(s.k)}</td><td style="color:${COL[ka]}">${c1(s.avg)}</td>` +
      `<td class="bar"><div class="b"><span style="width:${Math.min(100, s.tot! / mx * 100).toFixed(1)}%;background:${COL[k]}"></span><i style="left:${(s.mt.m / mx * 100).toFixed(1)}%"></i></div></td><td><b style="color:${COL[k]}">${c1(s.tot)}</b></td><td class="m">${s.mt.m}</td></tr>`;
  }
  filas += `<tr class="vz"><td class="l"><b>Varias zonas</b> <span class="mut">(aparte)</span></td><td>${vo}</td><td>${c0(vk)}</td><td></td><td class="mut l" style="font-size:7pt">no entran en el total</td><td><b>${c1(vr)}</b></td><td class="m">—</td></tr>`;
  const titulo = 'Productividad por zona · ' + fecha.toLowerCase();
  const lst = (a: string[], vacio: string) => '<ul>' + (a.length ? a : [vacio]).slice(0, 3).map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
@page{size:Letter;margin:0}
*{box-sizing:border-box}body{margin:0;background:#fff;font-family:'IBM Plex Sans','DejaVu Sans',Arial,sans-serif;color:#1F2328;font-size:8.4pt;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-variant-numeric:tabular-nums}
.bar-top{position:sticky;top:0;display:flex;gap:8px;justify-content:flex-end;padding:8px 14px;background:#1F2328}.bar-top button{font:600 12px 'IBM Plex Sans',Arial,sans-serif;padding:7px 12px;border:1px solid #fff;border-radius:4px;background:#fff;color:#1F2328;cursor:pointer}.bar-top button+button{background:transparent;color:#fff}
@media screen{body{background:#E9ECEF}.pg{box-shadow:0 4px 18px rgba(0,0,0,.12);margin:16px auto}}
@media print{.bar-top{display:none}}
.pg{max-width:216mm;margin:0 auto;padding:12mm 13mm;min-height:279mm;position:relative;background:#fff}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #D7262B;padding-bottom:8px}
.hd img{height:34px}.hr{text-align:right;font-size:7pt;color:#6B7280;line-height:1.5}.hr b{display:block;color:#1F2328;font-size:10.5pt}
.k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 14px}.kp{border:1px solid #E3E6EA;border-radius:6px;padding:8px 10px}
.kp .l{font-size:7pt;color:#6B7280}.kp .v{font-weight:600;font-size:18pt;margin:2px 0 1px}.kp .s{font-size:7pt;color:#6B7280}
h2{font-size:10pt;font-weight:600;margin:0 0 6px;padding-bottom:3px;border-bottom:1px solid #E3E6EA}
table{border-collapse:collapse;width:100%}
th{font-size:6.8pt;font-weight:600;color:#6B7280;text-align:right;padding:3px 5px;border-bottom:1px solid #C9CED5}th.l,td.l{text-align:left}
td{padding:3.4px 5px;border-bottom:1px solid #EEF0F2;text-align:right}td.m{color:#6B7280}
td.bar{width:30%}.b{position:relative;height:9px;background:#F1F3F5;border-radius:2px}.b span{display:block;height:100%;border-radius:2px}.b i{position:absolute;top:-2px;bottom:-2px;width:1.5px;background:#1F2328}
tr.vz td{border-top:1px solid #C9CED5;color:#3D434B}.mut{color:#6B7280}
.notas{margin-top:14px;border:1px solid #E3E6EA;border-radius:6px;padding:8px 12px;display:grid;grid-template-columns:1fr 1fr;gap:16px}.notas .t{font-weight:600;font-size:7.6pt;margin-bottom:2px}.notas .t i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}.notas ul{margin:0;padding-left:13px}.notas li{font-size:7.4pt;line-height:1.5;color:#3D434B}
.nota{margin-top:10px;font-size:6.4pt;color:#9AA1AB;line-height:1.5}
</style></head><body>
<div class="bar-top"><button id="pdf" type="button">Guardar PDF</button><button id="cerrar" type="button">Cerrar</button></div>
<div class="pg">
<div class="hd"><img src="${logo}" alt="Vidri"><div class="hr"><b>Productividad por zona · CD Nejapa</b>${fecha.charAt(0) + fecha.slice(1).toLowerCase()} · corte ${hc}</div></div>
<div class="k">
<div class="kp"><div class="l">Líneas por hora</div><div class="v" style="color:${COL[est(rZ, meta, GLOBAL.t)]}">${c1(rZ)}</div><div class="s">meta ${meta}</div></div>
<div class="kp"><div class="l">Zonas en meta</div><div class="v">${en.length} de ${S.length}</div><div class="s">${Z.nP} personas</div></div>
<div class="kp"><div class="l">Líneas preparadas</div><div class="v">${c0(Z.tk)}</div><div class="s">${c1(Z.th)} h</div></div>
<div class="kp"><div class="l">Varias zonas</div><div class="v">${c1(vr)}</div><div class="s">${vo} órdenes, aparte</div></div>
</div>
<h2>Por zona</h2>
<table><tr><th class="l">Zona</th><th>Órdenes</th><th>Líneas</th><th>Prom. personas</th><th class="l">Total vs meta</th><th>Total</th><th>Meta</th></tr>${filas}</table>
<div class="notas"><div><div class="t"><i style="background:${COL.g}"></i>Lo bueno</div>${lst(bueno, 'Ninguna zona sobre la meta con 3 h o más.')}</div><div><div class="t"><i style="background:${COL.y}"></i>Por mejorar</div>${lst(mejorar, 'Todas las zonas en meta.')}</div></div>
<div class="nota">Total = líneas ÷ horas de la zona · marca negra = meta · sin órdenes de 1 SKU, de menos de 10 s por SKU ni de más de 4 h · todos los tipos de pedido</div>
</div>
<script>document.getElementById("pdf").onclick=function(){window.print()};document.getElementById("cerrar").onclick=function(){try{parent.__cerrarReporteProd()}catch(e){window.close()}};<\/script>
</body></html>`;
  return { html, titulo };
}

/** Muestra el reporte encima de la página (con botones Guardar PDF y Cerrar). */
export function mostrarReporte(doc: { html: string; titulo: string }) {
  document.getElementById('rep-ov')?.remove();
  const ov = document.createElement('div'); ov.id = 'rep-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(31,35,40,.55);display:flex';
  const fr = document.createElement('iframe'); fr.title = doc.titulo; fr.style.cssText = 'flex:1;border:0;background:#E9ECEF';
  ov.appendChild(fr); document.body.appendChild(ov);
  (window as unknown as { __cerrarReporteProd: () => void }).__cerrarReporteProd = () => { ov.remove(); document.body.style.overflow = ''; };
  document.body.style.overflow = 'hidden';
  fr.srcdoc = doc.html;
}
