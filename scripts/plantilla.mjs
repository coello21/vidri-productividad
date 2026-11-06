// Junta dist-copia/index.html con su JS y CSS en un solo archivo: dist/plantilla.html (el HTML que se descarga)
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const dir = resolve('dist-copia');
let html = readFileSync(resolve(dir, 'index.html'), 'utf8');
const leer = (src) => readFileSync(resolve(dir, src), 'utf8');
// JS: dentro de <script> no puede ir "</script" ni "<!--"
const js = (t) => t.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
let n = 0;
html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => { n++; return '<script type="module">' + js(leer(src)) + '</script>'; });
html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/g, (_, href) => { n++; return '<style>' + leer(href) + '</style>'; });
if (!n || /src="\.\/assets|href="\.\/assets|src="\.\.\/assets|href="\.\.\/assets/.test(html)) throw new Error('plantilla: quedaron archivos sin juntar');
const destino = process.env.SALIDA ? resolve(process.env.SALIDA) : resolve('dist/plantilla.html');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, html);
rmSync(resolve('dist-copia'), { recursive: true, force: true });
console.log(destino + ': ' + Math.round(html.length / 1024) + ' KB');
