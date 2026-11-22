/*
 * guia.js
 * ------------------------------------------------------------------
 * La «Guía de uso»: oscurece la página y deja iluminada solo la parte que
 * se explica. El mensaje sale siempre en el mismo sitio (abajo, en el centro),
 * así el botón «Siguiente» no se mueve y no hay que ir detrás de él con el
 * ratón. Solo si taparía lo que se explica (algo fijo abajo), sube arriba.
 * «Saltar» sale de la guía. También funciona con el teclado:
 * → (siguiente), ← (anterior) y Escape (salir).
 *
 *   const guia = crearGuia(pasos, { antesDeEmpezar });
 *   guia.empezar();
 *
 * Cada paso: { elemento: '#selector' | () => elemento | selector, titulo, texto, icono? }
 * Si un paso no se ve en ese momento (por ejemplo, algo que solo sale en el
 * móvil), se salta solo.
 */

import { icono } from './iconos.js';

const MARGEN = 8;       // aire alrededor de lo iluminado
const SEPARACION = 16;  // entre lo iluminado y el mensaje
const BORDE = 12;       // distancia mínima al borde de la pantalla

const seVe = (elemento) => Boolean(elemento) && elemento.getClientRects().length > 0
  && getComputedStyle(elemento).visibility !== 'hidden';

function elementoDe(paso) {
  const valor = typeof paso.elemento === 'function' ? paso.elemento() : paso.elemento;
  const elemento = typeof valor === 'string' ? document.querySelector(valor) : valor;
  return seVe(elemento) ? elemento : null;
}

/** ¿Está fijo en la pantalla (no se mueve al bajar por la página)? Él o algo que lo contiene */
function esFijo(elemento) {
  for (let e = elemento; e && e !== document.body; e = e.parentElement) {
    if (getComputedStyle(e).position === 'fixed') return true;
  }
  return false;
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
      <div class="guia__bocadillo" data-lado="abajo">
        <span class="guia__adorno" aria-hidden="true"></span>
        <div class="guia__cabecera">
          <span class="guia__icono" aria-hidden="true"></span>
          <p class="guia__paso" id="guia-paso"></p>
        </div>
        <h2 class="guia__titulo" id="guia-titulo"></h2>
        <p class="guia__texto" id="guia-texto"></p>
        <div class="guia__progreso" aria-hidden="true"><span class="guia__hecho"></span></div>
        <div class="guia__botones">
          <button type="button" class="boton guia__saltar">Saltar</button>
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

    const bocadillo = raiz.querySelector('.guia__bocadillo');
    raiz.querySelector('#guia-paso').textContent = `Paso ${numero} de ${visibles}`;
    raiz.querySelector('#guia-titulo').textContent = paso.titulo;
    raiz.querySelector('#guia-texto').textContent = paso.texto;
    raiz.querySelector('.guia__icono').innerHTML = icono(paso.icono ?? 'i-guia');
    raiz.querySelector('.guia__hecho').style.width = `${(numero / visibles) * 100}%`;
    raiz.querySelector('.guia__siguiente span').textContent = ultimo ? 'Terminar' : 'Siguiente';

    // Que se vea entero por encima del mensaje: si no, movemos la página
    if (!esFijo(elemento)) {
      const caja = elemento.getBoundingClientRect();
      const arriba = BORDE + MARGEN;
      const abajo = window.innerHeight - bocadillo.offsetHeight - BORDE - SEPARACION - MARGEN;
      if (caja.top < arriba || caja.bottom > abajo) {
        const hueco = abajo - arriba;
        const destino = caja.height <= hueco ? arriba + (hueco - caja.height) / 2 : arriba;
        window.scrollBy({ top: caja.top - destino, behavior: 'auto' });
      }
    }
    colocar();

    bocadillo.classList.remove('guia__bocadillo--nuevo');
    void bocadillo.offsetWidth; // reinicia la animación del texto
    bocadillo.classList.add('guia__bocadillo--nuevo');
    raiz.querySelector('.guia__siguiente').focus({ preventScroll: true });
  }

  /** Pone el foco de luz encima del elemento; el mensaje, abajo (o arriba si tapara algo fijo) */
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

    // ¿El mensaje de abajo taparía lo iluminado? Solo pasa con cosas fijas abajo
    // (la barra Luz/Gasolina del móvil): entonces el mensaje va arriba.
    const bocadillo = raiz.querySelector('.guia__bocadillo');
    const b = bocadillo.getBoundingClientRect();
    const anchoB = b.width;
    const altoB = b.height;
    const izquierda = (ancho - anchoB) / 2;
    const arribaAbajo = alto - altoB - BORDE;
    const tapa = foco.bottom > arribaAbajo - 4 && foco.top < alto
      && foco.right > izquierda && foco.left < izquierda + anchoB
      && esFijo(elemento);
    bocadillo.dataset.lado = tapa ? 'arriba' : 'abajo';
  }

  return { empezar, terminar, activa: () => Boolean(raiz) };
}
