/*
 * ajustes.js
 * ------------------------------------------------------------------
 * El panel de ajustes de la izquierda. Lo usan las dos apps:
 *   - Tema: claro, oscuro o automático (oscuro de 20:00 a 8:00).
 *   - Tamaño de letra, con una barra deslizante.
 *   - Botones «Personalizar» y «Restaurar todo» (solo en la app de la luz).
 *   - Acceso directo a la otra app.
 *
 * En el móvil el panel es un cajón que sale desde la izquierda; en
 * pantallas anchas se queda fijo (eso lo decide el CSS).
 */

import { icono } from './iconos.js';

const CLAVE = 'cuando-lavadora:ajustes';
export const AJUSTES_INICIALES = { tema: 'claro', letra: 100 };
const HORA_OSCURO = 20; // a partir de las 20:00…
const HORA_CLARO = 8;   // …y hasta las 8:00, el modo automático usa el tema oscuro
const COLOR_NAVEGADOR = { claro: '#f5f4fa', oscuro: '#14151d' };

let ajustes = leer();

function leer() {
  try {
    return { ...AJUSTES_INICIALES, ...JSON.parse(localStorage.getItem(CLAVE)) };
  } catch {
    return { ...AJUSTES_INICIALES };
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(ajustes));
  } catch {
    // Navegación privada: los ajustes duran hasta cerrar la página
  }
}

/** 'claro' u 'oscuro', según lo elegido y (en automático) la hora */
export function temaActual(ahora = new Date()) {
  if (ajustes.tema !== 'auto') return ajustes.tema;
  const hora = ahora.getHours();
  return hora >= HORA_OSCURO || hora < HORA_CLARO ? 'oscuro' : 'claro';
}

/** Pone el tema y el tamaño de letra en la página */
export function aplicarAjustes() {
  const raiz = document.documentElement;
  const tema = temaActual();
  const cambia = raiz.dataset.tema !== tema;
  raiz.dataset.tema = tema;
  // Avisamos a quien lo necesite (el mapa cambia su fondo claro u oscuro)
  if (cambia) document.dispatchEvent(new CustomEvent('cambiotema', { detail: tema }));
  // Todo el CSS mide la letra en rem, así que cambiar el tamaño base lo agranda todo
  raiz.style.fontSize = ajustes.letra === 100 ? '' : `${ajustes.letra}%`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_NAVEGADOR[tema]);
}

export function restaurarAjustes() {
  ajustes = { ...AJUSTES_INICIALES };
  guardar();
  aplicarAjustes();
  pintarControles();
}

let panel;
let velo;
let botonAbrir;
const escritorio = window.matchMedia('(min-width: 1280px)');

/**
 * Crea el panel dentro de <aside id="panel">.
 * opciones.personalizar: { alPulsar, alRestaurar } o null (la app de la gasolina no lo tiene)
 * opciones.atajo: { href, clase, icono, titulo, texto } → tarjeta para ir a la otra app
 * Devuelve funciones para que la app pueda cambiar cosas del panel.
 */
export function iniciarPanel({ personalizar = null, atajo }) {
  panel = document.querySelector('#panel');
  velo = document.querySelector('#velo');
  botonAbrir = document.querySelector('#abrir-panel');

  panel.innerHTML = `
    <div class="panel__cabecera">
      <p class="panel__titulo">Ajustes</p>
      <button type="button" class="boton-icono panel__cerrar" aria-label="Cerrar ajustes">${icono('i-cerrar')}</button>
    </div>

    <section class="panel__grupo" aria-labelledby="titulo-tema">
      <p class="panel__etiqueta" id="titulo-tema">Tema</p>
      <div class="pestanas" role="radiogroup" aria-labelledby="titulo-tema">
        <button type="button" class="pestana" role="radio" data-tema="claro">${icono('i-sol')}Claro</button>
        <button type="button" class="pestana" role="radio" data-tema="oscuro">${icono('i-luna')}Oscuro</button>
        <button type="button" class="pestana" role="radio" data-tema="auto">${icono('i-auto')}Auto</button>
      </div>
      <p class="panel__nota">Automático: oscuro de 20:00 a 8:00.</p>
    </section>

    <section class="panel__grupo">
      <label class="panel__etiqueta" for="tamano-letra">
        Tamaño de letra <output id="valor-letra" for="tamano-letra"></output>
      </label>
      <div class="deslizador">
        <span class="deslizador__a deslizador__a--pequena" aria-hidden="true">A</span>
        <input type="range" id="tamano-letra" min="85" max="130" step="5">
        <span class="deslizador__a deslizador__a--grande" aria-hidden="true">A</span>
      </div>
      <p class="deslizador__muestra">Así se verá el texto de la app.</p>
    </section>

    ${personalizar ? `
    <section class="panel__grupo">
      <p class="panel__etiqueta">Pantalla principal</p>
      <div class="panel__botones">
        <button type="button" class="boton boton--suave" id="boton-personalizar">
          ${icono('i-personalizar')}<span>Personalizar</span>
        </button>
        <button type="button" class="boton boton--peligro" id="boton-restaurar" hidden>
          ${icono('i-restaurar')}Restaurar todo
        </button>
      </div>
      <p class="panel__nota">Mueve las tarjetas y elige qué aparatos están en la pantalla principal y cuáles en «Más».</p>
    </section>` : ''}

    <a class="atajo atajo--neon ${atajo.clase ?? ''}" href="${atajo.href}">
      <span class="atajo__fondo" aria-hidden="true"></span>
      <span class="atajo__icono">${icono(atajo.icono)}</span>
      <span class="atajo__titulo">${atajo.titulo}</span>
      <span class="atajo__texto" id="atajo-texto">${atajo.texto}</span>
      <span class="atajo__flecha">${icono('i-flecha')}</span>
    </a>`;

  // Tema
  for (const boton of panel.querySelectorAll('[data-tema]')) {
    boton.addEventListener('click', () => {
      ajustes.tema = boton.dataset.tema;
      guardar();
      aplicarAjustes();
      pintarControles();
    });
  }

  // Tamaño de letra: se aplica mientras se mueve la barra
  panel.querySelector('#tamano-letra').addEventListener('input', (evento) => {
    ajustes.letra = Number(evento.target.value);
    guardar();
    aplicarAjustes();
    pintarControles();
  });

  // Personalizar
  if (personalizar) {
    panel.querySelector('#boton-personalizar').addEventListener('click', () => {
      personalizar.alPulsar();
      if (!escritorio.matches) cerrar(); // en el móvil cerramos para ver las tarjetas temblar
    });
    panel.querySelector('#boton-restaurar').addEventListener('click', () => personalizar.alRestaurar());
  }

  // Abrir y cerrar el cajón
  botonAbrir?.addEventListener('click', abrir);
  panel.querySelector('.panel__cerrar').addEventListener('click', cerrar);
  velo.addEventListener('click', cerrar);
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && panel.classList.contains('panel--abierto')) cerrar();
  });
  escritorio.addEventListener('change', cerrar);

  // En automático, comprobamos la hora cada minuto
  setInterval(() => ajustes.tema === 'auto' && aplicarAjustes(), 60 * 1000);

  pintarControles();

  return {
    /** Cambia el botón «Personalizar» por «Listo» y enseña «Restaurar todo» */
    marcarEdicion(editando) {
      const boton = panel.querySelector('#boton-personalizar');
      if (!boton) return;
      boton.querySelector('span').textContent = editando ? 'Listo' : 'Personalizar';
      boton.setAttribute('aria-pressed', String(editando));
      panel.querySelector('#boton-restaurar').hidden = !editando;
    },
    ponerTextoAtajo(texto) {
      panel.querySelector('#atajo-texto').textContent = texto;
    },
    cerrar,
  };
}

function pintarControles() {
  if (!panel) return;
  for (const boton of panel.querySelectorAll('[data-tema]')) {
    boton.setAttribute('aria-checked', String(boton.dataset.tema === ajustes.tema));
  }
  const barra = panel.querySelector('#tamano-letra');
  barra.value = ajustes.letra;
  // Parte coloreada de la barra (hasta el punto)
  barra.style.setProperty('--progreso', `${((ajustes.letra - barra.min) / (barra.max - barra.min)) * 100}%`);
  panel.querySelector('#valor-letra').textContent = `${ajustes.letra} %`;
}

function abrir() {
  if (escritorio.matches) return;
  panel.classList.add('panel--abierto');
  velo.hidden = false;
  botonAbrir?.setAttribute('aria-expanded', 'true');
  // Mientras está abierto, el resto de la página no se puede usar con el teclado
  document.querySelector('.app').inert = true;
  panel.querySelector('.panel__cerrar').focus();
}

function cerrar() {
  if (!panel.classList.contains('panel--abierto')) return;
  panel.classList.remove('panel--abierto');
  velo.hidden = true;
  botonAbrir?.setAttribute('aria-expanded', 'false');
  document.querySelector('.app').inert = false;
  botonAbrir?.focus({ preventScroll: true });
}
