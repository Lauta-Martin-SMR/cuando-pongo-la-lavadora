/*
 * ordenar.js
 * ------------------------------------------------------------------
 * Permite arrastrar elementos (con el dedo o con el ratón) para cambiarlos
 * de orden. Sirve para listas (las tarjetas) y para rejillas (los aparatos).
 *
 * Cómo funciona:
 *   1. Al apretar, el elemento «se levanta» y sigue al dedo.
 *   2. Cuando el dedo pasa la mitad de otro elemento, se intercambian.
 *      Los demás se deslizan a su nuevo sitio con una animación (técnica FLIP).
 *   3. Si el dedo se acerca al borde de la pantalla, la página se desplaza sola.
 *   4. Al soltar, el elemento cae en su hueco y se avisa con alTerminar().
 */

const SUAVE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * contenedor: el elemento padre de los que se mueven
 * opciones.elementos: selector CSS de los hijos que se pueden mover
 * opciones.asa: selector de la parte por la que se agarra (null = todo el elemento)
 * opciones.activo(): devuelve true cuando se puede arrastrar (modo Personalizar)
 * opciones.alTerminar(elementos): se llama al soltar, con los elementos en su nuevo orden
 */
export function hacerOrdenable(contenedor, { elementos, asa = null, activo, alTerminar }) {
  let arrastre = null;
  const hijos = () => [...contenedor.children].filter((hijo) => hijo.matches(elementos));

  contenedor.addEventListener('pointerdown', (evento) => {
    if (!activo() || evento.button > 0 || arrastre) return;
    if (evento.target.closest('[data-no-arrastrar]')) return;
    const agarre = evento.target.closest(asa ?? elementos);
    const elemento = agarre?.closest(elementos);
    if (!elemento || elemento.parentElement !== contenedor) return;

    evento.preventDefault();
    elemento.setPointerCapture(evento.pointerId);
    const caja = elemento.getBoundingClientRect();
    arrastre = {
      elemento,
      puntero: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      agarreX: evento.clientX - caja.left, // dónde lo hemos agarrado
      agarreY: evento.clientY - caja.top,
      tx: 0,
      ty: 0,
    };
    elemento.classList.add('arrastrando');
    navigator.vibrate?.(10);
    bucleDesplazamiento();
  });

  contenedor.addEventListener('pointermove', (evento) => {
    if (!arrastre || evento.pointerId !== arrastre.puntero) return;
    arrastre.x = evento.clientX;
    arrastre.y = evento.clientY;
    actualizar();
  });

  const soltar = (evento) => {
    if (!arrastre || evento.pointerId !== arrastre.puntero) return;
    const { elemento } = arrastre;
    const desde = elemento.style.transform;
    elemento.style.transform = '';
    elemento.classList.remove('arrastrando');
    if (desde) elemento.animate([{ transform: desde }, { transform: 'none' }], { duration: 220, easing: SUAVE });
    arrastre = null;
    alTerminar(hijos());
  };
  contenedor.addEventListener('pointerup', soltar);
  contenedor.addEventListener('pointercancel', soltar);

  /** Coloca el elemento bajo el dedo y lo intercambia si hace falta */
  function actualizar() {
    const { elemento, x, y } = arrastre;

    // ¿Sobre qué otro elemento está el dedo?
    const objetivo = hijos().find((hijo) => {
      if (hijo === elemento) return false;
      const r = hijo.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

    if (objetivo) {
      const lista = hijos();
      const haciaDelante = lista.indexOf(elemento) < lista.indexOf(objetivo);
      const r = objetivo.getBoundingClientRect();
      const mia = elemento.getBoundingClientRect();
      const mismaFila = Math.abs(r.top - mia.top + arrastre.ty) < r.height / 2;
      // Solo intercambiamos al pasar la mitad: así no tiembla entre dos posiciones
      const pasado = mismaFila
        ? (haciaDelante ? x > r.left + r.width / 2 : x < r.left + r.width / 2)
        : (haciaDelante ? y > r.top + r.height / 2 : y < r.top + r.height / 2);
      if (pasado) moverConAnimacion(() => (haciaDelante ? objetivo.after(elemento) : objetivo.before(elemento)));
    }

    // El elemento sigue al dedo, esté donde esté su hueco
    const caja = elemento.getBoundingClientRect();
    const baseX = caja.left - arrastre.tx;
    const baseY = caja.top - arrastre.ty;
    arrastre.tx = x - arrastre.agarreX - baseX;
    arrastre.ty = y - arrastre.agarreY - baseY;
    elemento.style.transform = `translate(${arrastre.tx}px, ${arrastre.ty}px)`;
  }

  /** Técnica FLIP: apuntamos dónde estaba cada uno, movemos y animamos la diferencia */
  function moverConAnimacion(cambio) {
    const otros = hijos().filter((hijo) => hijo !== arrastre.elemento);
    const antes = new Map(otros.map((hijo) => [hijo, hijo.getBoundingClientRect()]));
    cambio();
    for (const hijo of otros) {
      const a = antes.get(hijo);
      const b = hijo.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (dx || dy) {
        hijo.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 240, easing: SUAVE });
      }
    }
  }

  /** Desplaza la página si el dedo está cerca del borde de arriba o de abajo */
  function bucleDesplazamiento() {
    if (!arrastre) return;
    const margen = 80;
    let paso = 0;
    if (arrastre.y < margen) paso = -(margen - arrastre.y) / 5;
    else if (arrastre.y > innerHeight - margen) paso = (arrastre.y - (innerHeight - margen)) / 5;
    if (paso) {
      window.scrollBy(0, paso);
      actualizar();
    }
    requestAnimationFrame(bucleDesplazamiento);
  }
}
