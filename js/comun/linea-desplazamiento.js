/*
 * linea-desplazamiento.js
 * ------------------------------------------------------------------
 * Una «mini línea» debajo de una fila que se desliza hacia los lados (por
 * ejemplo, los carburantes): enseña qué parte se ve y, al arrastrarla o
 * tocarla, mueve la fila. Solo aparece cuando hay más de lo que cabe.
 *
 *   crearLineaDesplazamiento(document.querySelector('#carburantes'));
 *
 * Es una ayuda para el ratón: la fila se sigue moviendo con el dedo, con la
 * rueda o con el tabulador, así que los lectores de pantalla no la necesitan.
 */

export function crearLineaDesplazamiento(fila) {
  const linea = document.createElement('div');
  linea.className = 'linea-desplazamiento';
  linea.setAttribute('aria-hidden', 'true');
  linea.innerHTML = '<span class="linea-desplazamiento__pista"><span class="linea-desplazamiento__mango"></span></span>';
  fila.after(linea);
  const pista = linea.querySelector('.linea-desplazamiento__pista');
  const mango = linea.querySelector('.linea-desplazamiento__mango');
  let arrastre = null;

  /** Pone el mango donde toca: su ancho es lo que se ve, y su sitio, lo que se ha movido */
  function actualizar() {
    const sobra = fila.scrollWidth - fila.clientWidth;
    linea.hidden = sobra <= 2;
    if (linea.hidden) return;
    const ancho = pista.clientWidth;
    const anchoMango = Math.max(16, (ancho * fila.clientWidth) / fila.scrollWidth);
    const x = (ancho - anchoMango) * Math.min(1, Math.max(0, fila.scrollLeft / sobra));
    mango.style.width = `${anchoMango}px`;
    mango.style.transform = `translateX(${x}px)`;
  }

  function mover(evento) {
    const { caja, anchoMango, agarre } = arrastre;
    const recorrido = caja.width - anchoMango;
    const x = Math.min(Math.max(evento.clientX - caja.left - agarre, 0), recorrido);
    fila.scrollLeft = recorrido > 0 ? (x / recorrido) * (fila.scrollWidth - fila.clientWidth) : 0;
  }

  linea.addEventListener('pointerdown', (evento) => {
    if (evento.button !== 0) return;
    evento.preventDefault();
    const caja = pista.getBoundingClientRect();
    const cajaMango = mango.getBoundingClientRect();
    // Si se toca fuera del mango, el mango salta ahí (por su centro)
    const dentro = evento.clientX >= cajaMango.left && evento.clientX <= cajaMango.right;
    arrastre = { caja, anchoMango: cajaMango.width, agarre: dentro ? evento.clientX - cajaMango.left : cajaMango.width / 2 };
    fila.classList.add('arrastrando');   // sin «imán» mientras se arrastra (ver CSS)
    linea.classList.add('linea-desplazamiento--activa');
    linea.setPointerCapture(evento.pointerId);
    mover(evento);
  });

  linea.addEventListener('pointermove', (evento) => {
    if (arrastre) mover(evento);
  });

  const soltar = () => {
    if (!arrastre) return;
    arrastre = null;
    linea.classList.remove('linea-desplazamiento--activa');
    // Al soltar vuelve el «imán»: la fila se coloca en la tarjeta más cercana.
    // (Hay que decírselo: si no, el navegador volvería a la tarjeta de antes de arrastrar.)
    const destino = tarjetaMasCercana();
    fila.classList.remove('arrastrando');
    fila.scrollTo({ left: destino, behavior: 'smooth' });
  };
  linea.addEventListener('pointerup', soltar);
  linea.addEventListener('pointercancel', soltar);

  /** Dónde tiene que quedarse la fila para que la tarjeta más cercana empiece en el borde */
  function tarjetaMasCercana() {
    const inicio = fila.getBoundingClientRect().left + (parseFloat(getComputedStyle(fila).paddingLeft) || 0);
    let mejor = null;
    for (const hijo of fila.children) {
      const distancia = hijo.getBoundingClientRect().left - inicio;
      if (mejor === null || Math.abs(distancia) < Math.abs(mejor)) mejor = distancia;
    }
    return Math.min(Math.max(0, fila.scrollLeft + (mejor ?? 0)), fila.scrollWidth - fila.clientWidth);
  }

  fila.addEventListener('scroll', actualizar, { passive: true });
  new ResizeObserver(actualizar).observe(fila);
  new MutationObserver(actualizar).observe(fila, { childList: true });
  actualizar();
  return { actualizar };
}
