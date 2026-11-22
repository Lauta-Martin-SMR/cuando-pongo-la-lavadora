/*
 * guia.js
 * ------------------------------------------------------------------
 * La «Guía de uso»: oscurece la página y deja iluminada solo la parte que
 * se explica, con un mensaje al lado. «Siguiente» pasa a la siguiente parte
 * y «Saltar» sale de la guía. También funciona con el teclado:
 * → o Intro (siguiente), ← (anterior) y Escape (salir).
 *
 *   const guia = crearGuia(pasos, { antesDeEmpezar });
 *   guia.empezar();
 *
 * Cada paso: { elemento: '#selector' | () => elemento | selector, titulo, texto }
 * Si un paso no se ve en ese momento (por ejemplo, algo que solo sale en el
 * móvil), se salta solo.
 */

import { icono } from './iconos.js';

const MARGEN = 8;      // aire alrededor de lo iluminado
const SEPARACION = 14; // entre lo iluminado y el mensaje
const BORDE = 12;      // distancia mínima al borde de la pantalla

const seVe = (elemento) => Boolean(elemento) && elemento.getClientRects().length > 0
  && getComputedStyle(elemento).visibility !== 'hidden';

function elementoDe(paso) {
  const valor = typeof paso.elemento === 'function' ? paso.elemento() : paso.elemento;
  const elemento = typeof valor === 'string' ? document.querySelector(valor) : valor;
  return seVe(elemento) ? elemento : null;
}

export function crearGuia(pasos, { antesDeEmpezar = () => {} } = {}) {
  let raiz = null;
  let indice = -1;
  let elemento = null;
  let focoAnterior = null;
  let pendiente = 0;

  function construir() {
    raiz = document.createElement('div');
    raiz.className = 'guia';
    raiz.setAttribute('role', 'dialog');
    raiz.setAttribute('aria-modal', 'true');
    raiz.setAttribute('aria-labelledby', 'guia-titulo');
    raiz.setAttribute('aria-describedby', 'guia-texto');
    raiz.innerHTML = `
      <div class="guia__bloqueo"></div>
      <div class="guia__foco" aria-hidden="true"></div>
      <div class="guia__bocadillo">
        <p class="guia__paso" id="guia-paso"></p>
        <h2 class="guia__titulo" id="guia-titulo"></h2>
        <p class="guia__texto" id="guia-texto"></p>
        <div class="guia__botones">
          <button type="button" class="boton boton--suave guia__saltar">Saltar</button>
          <button type="button" class="boton guia__siguiente"><span>Siguiente</span>${icono('i-flecha')}</button>
        </div>
      </div>`;
    document.body.append(raiz);
    raiz.querySelector('.guia__saltar').addEventListener('click', terminar);
    raiz.querySelector('.guia__siguiente').addEventListener('click', siguiente);
    // Tocar lo oscuro no hace nada: así no se sale sin querer
    raiz.querySelector('.guia__bloqueo').addEventListener('click', () => raiz.querySelector('.guia__siguiente').focus());
  }

  function alPulsarTecla(evento) {
    if (!raiz) return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      terminar();
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault();
      siguiente();
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault();
      anterior();
    } else if (evento.key === 'Tab') {
      // El foco se queda entre los dos botones
      const botones = [...raiz.querySelectorAll('.guia__botones button')];
      const actual = botones.indexOf(document.activeElement);
      evento.preventDefault();
      botones[(actual + (evento.shiftKey ? -1 : 1) + botones.length) % botones.length].focus();
    }
  }

  const reprogramar = () => {
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(colocar);
  };

  function empezar() {
    if (raiz) return;
    antesDeEmpezar();
    focoAnterior = document.activeElement;
    construir();
    document.documentElement.classList.add('guiando');
    document.addEventListener('keydown', alPulsarTecla, true);
    window.addEventListener('resize', reprogramar);
    window.addEventListener('scroll', reprogramar, true);
    indice = -1;
    siguiente();
  }

  function terminar() {
    if (!raiz) return;
    document.removeEventListener('keydown', alPulsarTecla, true);
    window.removeEventListener('resize', reprogramar);
    window.removeEventListener('scroll', reprogramar, true);
    cancelAnimationFrame(pendiente);
    raiz.classList.add('guia--saliendo');
    const quitar = raiz;
    raiz = null;
    elemento = null;
    document.documentElement.classList.remove('guiando');
    setTimeout(() => quitar.remove(), 220);
    focoAnterior?.focus?.({ preventScroll: true });
  }

  /** Busca el siguiente paso que se vea (sentido: +1 adelante, −1 atrás) */
  function buscar(desde, sentido) {
    for (let i = desde; i >= 0 && i < pasos.length; i += sentido) {
      const encontrado = elementoDe(pasos[i]);
      if (encontrado) return { i, encontrado };
    }
    return null;
  }

  function siguiente() {
    const paso = buscar(indice + 1, 1);
    if (!paso) {
      terminar();
      return;
    }
    mostrar(paso);
  }

  function anterior() {
    const paso = buscar(indice - 1, -1);
    if (paso) mostrar(paso);
  }

  function mostrar({ i, encontrado }) {
    indice = i;
    elemento = encontrado;
    const paso = pasos[i];
    const visibles = pasos.filter((p) => elementoDe(p)).length;
    const numero = pasos.slice(0, i + 1).filter((p) => elementoDe(p)).length;
    const ultimo = !buscar(i + 1, 1);

    raiz.querySelector('#guia-paso').textContent = `Paso ${numero} de ${visibles}`;
    raiz.querySelector('#guia-titulo').textContent = paso.titulo;
    raiz.querySelector('#guia-texto').textContent = paso.texto;
    raiz.querySelector('.guia__siguiente span').textContent = ultimo ? 'Terminar' : 'Siguiente';

    // Que se vea entero y que quepa el mensaje: si no, movemos la página
    colocar();
    const bocadillo = raiz.querySelector('.guia__bocadillo');
    const caja = elemento.getBoundingClientRect();
    const alto = window.innerHeight;
    const fuera = caja.top < BORDE || caja.bottom > alto - BORDE;
    if ((fuera || bocadillo.dataset.lado === 'encima') && getComputedStyle(elemento).position !== 'fixed' && !elemento.closest('.panel, .lateral')) {
      const cabeDebajo = caja.height + 2 * MARGEN + SEPARACION + bocadillo.offsetHeight + 2 * BORDE <= alto;
      const destino = cabeDebajo ? BORDE + MARGEN : Math.max(BORDE + MARGEN, (alto - caja.height) / 2);
      window.scrollBy({ top: caja.top - destino, behavior: 'auto' });
      colocar();
    }
    raiz.querySelector('.guia__bocadillo').classList.remove('guia__bocadillo--nuevo');
    void raiz.offsetWidth; // reinicia la animación
    raiz.querySelector('.guia__bocadillo').classList.add('guia__bocadillo--nuevo');
    raiz.querySelector('.guia__siguiente').focus({ preventScroll: true });
  }

  /** Pone el foco de luz encima del elemento y el mensaje donde quepa */
  function colocar() {
    if (!raiz || !elemento) return;
    const ancho = window.innerWidth;
    const alto = window.innerHeight;
    const caja = elemento.getBoundingClientRect();
    const foco = {
      top: Math.max(6, caja.top - MARGEN),
      left: Math.max(6, caja.left - MARGEN),
      right: Math.min(ancho - 6, caja.right + MARGEN),
      bottom: Math.min(alto - 6, caja.bottom + MARGEN),
    };
    const luz = raiz.querySelector('.guia__foco');
    luz.style.top = `${foco.top}px`;
    luz.style.left = `${foco.left}px`;
    luz.style.width = `${Math.max(0, foco.right - foco.left)}px`;
    luz.style.height = `${Math.max(0, foco.bottom - foco.top)}px`;

    const bocadillo = raiz.querySelector('.guia__bocadillo');
    const b = bocadillo.getBoundingClientRect();
    const centrarX = () => Math.min(Math.max(BORDE, (foco.left + foco.right) / 2 - b.width / 2), ancho - b.width - BORDE);
    const centrarY = () => Math.min(Math.max(BORDE, foco.top), alto - b.height - BORDE);
    const huecos = [
      // En pantallas anchas, al lado; en el móvil, debajo o encima
      ...(ancho >= 900 ? [
        { cabe: foco.right + SEPARACION + b.width <= ancho - BORDE, x: foco.right + SEPARACION, y: centrarY(), lado: 'derecha' },
        { cabe: foco.left - SEPARACION - b.width >= BORDE, x: foco.left - SEPARACION - b.width, y: centrarY(), lado: 'izquierda' },
      ] : []),
      { cabe: foco.bottom + SEPARACION + b.height <= alto - BORDE, x: centrarX(), y: foco.bottom + SEPARACION, lado: 'abajo' },
      { cabe: foco.top - SEPARACION - b.height >= BORDE, x: centrarX(), y: foco.top - SEPARACION - b.height, lado: 'arriba' },
    ];
    // Si no cabe en ningún lado (algo muy grande), abajo del todo, por encima
    const hueco = huecos.find((h) => h.cabe) ?? { x: centrarX(), y: alto - b.height - BORDE, lado: 'encima' };
    bocadillo.style.left = `${hueco.x}px`;
    bocadillo.style.top = `${hueco.y}px`;
    bocadillo.dataset.lado = hueco.lado;
  }

  return { empezar, terminar, activa: () => Boolean(raiz) };
}
