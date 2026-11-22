/*
 * conmutador.js
 * ------------------------------------------------------------------
 * La barra vertical de la derecha para cambiar de app: arriba la luz y abajo
 * la gasolina. Está en las dos páginas, en el mismo sitio, y no se mueve al
 * bajar por la página (eso lo hace el CSS: sección 6c de comun.css).
 *
 * Al tocar la otra mitad, la «lente» de cristal (estilo liquid glass) se
 * estira como una gota hasta ella, la nueva mitad se queda subrayada, el resto
 * de la página se funde con un desenfoque (clase «saliendo») y se cambia de
 * página. La página nueva aparece desde ese desenfoque (clase «llegando», que
 * pone el script del <head>) y su lente rebota un poco al «aterrizar».
 */

const CLAVE = 'cuando-lavadora:conmutador';
const DURACION = 560; // ms que tarda la lente en ir de una mitad a la otra
const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

export function iniciarConmutador() {
  const barra = document.querySelector('#conmutador');
  if (!barra) return;
  const lente = barra.querySelector('.conmutador__lente');
  const lados = [...barra.querySelectorAll('.conmutador__lado')];
  const propio = lados.find((lado) => lado.hasAttribute('aria-current'));
  const actualInicial = barra.dataset.actual;
  let yendo = false;

  // ¿Venimos de la otra app con la barra? → la lente aterriza con un rebote
  try {
    if (sessionStorage.getItem(CLAVE) === actualInicial && !menosMovimiento.matches) rebotar();
    sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento (navegación privada): sin rebote, no pasa nada
  }
  setTimeout(() => document.documentElement.classList.remove('llegando'), 700);

  barra.addEventListener('click', (evento) => {
    const lado = evento.target.closest('.conmutador__lado');
    if (!lado) return;
    // Con Ctrl, Cmd o Mayús se abre en otra pestaña o ventana, como cualquier enlace
    if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey || evento.button !== 0) return;
    evento.preventDefault();
    if (lado.hasAttribute('aria-current')) {
      if (!menosMovimiento.matches) rebotar();
      return;
    }
    if (!yendo) irA(lado);
  });

  function irA(lado) {
    yendo = true;
    const destino = lado.classList.contains('conmutador__lado--gasolina') ? 'gasolina' : 'luz';
    try {
      sessionStorage.setItem(CLAVE, destino);
    } catch {
      // nada
    }
    navigator.vibrate?.(10);

    if (menosMovimiento.matches) {
      marcar(lado, destino);
      location.href = lado.href;
      return;
    }

    moverLente(destino === 'gasolina');
    // La nueva mitad se marca cuando la lente ya está llegando…
    setTimeout(() => marcar(lado, destino), DURACION * 0.42);
    // …el resto de la página se funde…
    setTimeout(() => document.documentElement.classList.add('saliendo'), DURACION * 0.5);
    // …y la página cambia justo al terminar (mientras carga, la animación acaba)
    setTimeout(() => {
      location.href = lado.href;
    }, DURACION * 0.86);
  }

  /** Subraya la mitad elegida y coloca la lente en ella (sin animación) */
  function marcar(elegido, actual) {
    for (const lado of lados) {
      if (lado === elegido) lado.setAttribute('aria-current', 'page');
      else lado.removeAttribute('aria-current');
    }
    barra.dataset.actual = actual;
  }

  /**
   * La lente va de una mitad a la otra como una gota: primero se estira el
   * borde que va delante, luego la sigue el de atrás, se pasa un poco y se
   * asienta. Mientras, se estrecha y al llegar se ensancha (se «aplasta»).
   */
  function moverLente(bajando) {
    const caja = lente.getBoundingClientRect();
    const cajaBarra = barra.getBoundingClientRect();
    const alto = caja.height;
    const desde = caja.top - cajaBarra.top;
    const hasta = cajaBarra.height - alto - desde; // la otra mitad es simétrica
    const recorrido = Math.abs(hasta - desde);
    const marco = (arriba, abajo, escala, offset) => ({
      top: `${arriba}px`,
      height: `${Math.max(alto * 0.5, abajo - arriba)}px`,
      scale: escala,
      offset,
      easing: 'cubic-bezier(0.32, 0, 0.3, 1)',
    });

    const marcos = bajando
      ? [
        marco(desde, desde + alto, '1 1', 0),
        marco(desde + 6, desde + alto + recorrido * 0.62, '0.9 1', 0.3),
        marco(desde + recorrido * 0.5, hasta + alto + 6, '0.88 1', 0.55),
        marco(hasta + 8, hasta + alto - 2, '1.07 1', 0.78),
        marco(hasta, hasta + alto, '1 1', 1),
      ]
      : [
        marco(desde, desde + alto, '1 1', 0),
        marco(desde - recorrido * 0.62, desde + alto - 6, '0.9 1', 0.3),
        marco(hasta - 6, desde + alto - recorrido * 0.5, '0.88 1', 0.55),
        marco(hasta + 2, hasta + alto - 8, '1.07 1', 0.78),
        marco(hasta, hasta + alto, '1 1', 1),
      ];

    const animacion = lente.animate(marcos, { duration: DURACION, fill: 'forwards' });
    // El neón brilla un poco más mientras cambia
    barra.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.08) saturate(1.15)' }, { filter: 'brightness(1)' }], { duration: DURACION });
    animacion.finished.then(() => animacion.cancel()).catch(() => {});
  }

  /** Un rebote pequeño, como gelatina */
  function rebotar() {
    lente.animate([
      { scale: '1 1' },
      { scale: '1.08 0.93', offset: 0.3 },
      { scale: '0.96 1.04', offset: 0.6 },
      { scale: '1.02 0.99', offset: 0.82 },
      { scale: '1 1' },
    ], { duration: 520, easing: 'ease-out' });
  }

  // Al volver con «Atrás», el navegador puede enseñar la página tal y como se
  // quedó (con la lente en la otra mitad): la devolvemos a su sitio.
  window.addEventListener('pageshow', (evento) => {
    if (!evento.persisted) return;
    yendo = false;
    document.documentElement.classList.remove('saliendo', 'llegando');
    for (const animacion of lente.getAnimations()) animacion.cancel();
    marcar(propio, actualInicial);
  });
}
