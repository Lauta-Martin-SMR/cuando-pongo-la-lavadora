/*
 * iconos-en-linea.mjs
 * ------------------------------------------------------------------
 * Copia los iconos de iconos/iconos.svg dentro de cada página (al principio
 * del <body>, entre <!-- iconos:inicio --> y <!-- iconos:fin -->).
 *
 * ¿Por qué? Con los iconos en un archivo aparte (<use href="iconos.svg#…">),
 * Chrome cancela la transición suave entre la página de la luz y la de la
 * gasolina. Dentro de la página, además, los iconos salen a la vez que todo.
 *
 * Uso (Node 18 o superior), cada vez que cambies o añadas un icono:
 *   node herramientas/iconos-en-linea.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGINAS = ['index.html', 'gasolina/index.html', 'ayuda/index.html'];
const INICIO = '<!-- iconos:inicio -->';
const FIN = '<!-- iconos:fin -->';

const original = await fs.readFile(path.join(RAIZ, 'iconos/iconos.svg'), 'utf8');
const sprite = original
  .replace(/<!--[\s\S]*?-->/g, '')          // sin comentarios
  .replace(/>\s+</g, '><')                  // sin espacios entre etiquetas
  .trim()
  .replace(
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">',
  );

if (!sprite.includes('aria-hidden="true"')) throw new Error('No encuentro la etiqueta <svg> de iconos/iconos.svg');
const simbolos = sprite.match(/<symbol /g)?.length ?? 0;

for (const pagina of PAGINAS) {
  const archivo = path.join(RAIZ, pagina);
  let html = await fs.readFile(archivo, 'utf8');
  // Las referencias al archivo aparte pasan a ser a la copia de dentro: href="#i-…"
  html = html.replace(/href="(?:\.\.\/)?iconos\/iconos\.svg#/g, 'href="#');
  const bloque = `${INICIO}\n  ${sprite}\n  ${FIN}`;
  if (html.includes(INICIO)) {
    html = html.replace(new RegExp(`${INICIO}[\\s\\S]*?${FIN}`), bloque);
  } else {
    html = html.replace(/<body([^>]*)>/, `<body$1>\n  <!-- Iconos de la app (copia de iconos/iconos.svg; ver herramientas/iconos-en-linea.mjs) -->\n  ${bloque}`);
  }
  await fs.writeFile(archivo, html);
  console.log(`${pagina}: ${simbolos} iconos`);
}
