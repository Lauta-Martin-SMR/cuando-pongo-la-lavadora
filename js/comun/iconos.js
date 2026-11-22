/*
 * iconos.js
 * ------------------------------------------------------------------
 * Los iconos están en iconos/iconos.svg y cada página lleva una copia dentro,
 * al principio del <body> (la pone herramientas/iconos-en-linea.mjs).
 * Esta función escribe el HTML para usar uno.
 */

/** icono('i-lavadora') → <svg class="icono">…</svg> */
export function icono(nombre, clase = 'icono') {
  return `<svg class="${clase}" aria-hidden="true"><use href="#${nombre}"></use></svg>`;
}
