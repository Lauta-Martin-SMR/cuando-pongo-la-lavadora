/*
 * iconos.js
 * ------------------------------------------------------------------
 * Los iconos están todos en iconos/iconos.svg. Esta función escribe el
 * HTML para usar uno. La ruta se calcula desde este archivo, así sirve
 * igual en la página de la luz y en la de la gasolina (que está en otra carpeta).
 */

export const SPRITE = new URL('../../iconos/iconos.svg', import.meta.url).href;

/** icono('i-lavadora') → <svg class="icono">…</svg> */
export function icono(nombre, clase = 'icono') {
  return `<svg class="${clase}" aria-hidden="true"><use href="${SPRITE}#${nombre}"></use></svg>`;
}
