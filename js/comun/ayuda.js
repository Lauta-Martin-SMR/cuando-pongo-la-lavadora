/*
 * ayuda.js
 * ------------------------------------------------------------------
 * El botón de ayuda de las dos apps. Al pulsarlo se abre un desplegable con:
 *   - Tengo un problema    → ventana con soluciones (algunas con un botón que lo arregla)
 *   - Para qué sirve la app → la página ayuda/
 *   - Fuentes               → de dónde salen los datos, con un enlace para visitarlas
 *   - Guía de uso           → recorrido por la página (guia.js)
 *
 * Cada app le pasa su contenido: js/luz/ayuda-luz.js y js/gasolina/ayuda-gasolina.js.
 * Los botones que abren el desplegable son los que tienen aria-controls="menu-ayuda"
 * (en el móvil, el de la cabecera; en pantallas anchas, el de la columna de la derecha).
 */

import { icono } from './iconos.js';
import { crearGuia } from './guia.js';

/** Para contar un problema que no se arregla con lo de la ayuda: por correo */
export const CORREO = 'p7379491@gmail.com';
const NOMBRE_APP = { luz: 'la luz', gasolina: 'la gasolina' };

/**
 * Enlaces para escribir el correo ya empezado (asunto y datos del navegador):
 * gmail → abre Gmail con el correo listo; correo → la app de correo del móvil u ordenador.
 */
export function enlacesCorreo(app) {
  const asunto = `Problema en la app (${NOMBRE_APP[app] ?? app})`;
  const cuerpo = [
    'Hola, te cuento qué me pasa:',
    '',
    '',
    '',
    '—',
    `Parte de la app: ${NOMBRE_APP[app] ?? app}`,
    'Móvil u ordenador: ',
    `Navegador: ${navigator.userAgent}`,
  ].join('\n');
  const c = encodeURIComponent;
  return {
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${c(CORREO)}&su=${c(asunto)}&body=${c(cuerpo)}`,
    correo: `mailto:${CORREO}?subject=${c(asunto)}&body=${c(cuerpo)}`,
  };
}

/** Borra la copia guardada de la app y vuelve a cargarla (si hay conexión, baja la última versión) */
export async function actualizarApp() {
  try {
    for (const nombre of await caches.keys()) {
      if (nombre.startsWith('cuando-lavadora-')) await caches.delete(nombre);
    }
    const registros = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(registros.map((registro) => registro.update().catch(() => {})));
  } catch {
    // Sin caché o sin service worker: basta con recargar
  }
  location.reload();
}

const dominio = (url) => new URL(url).hostname.replace(/^www\./, '');

/**
 * app: 'luz' o 'gasolina' · paraQueSirve: enlace a la página que explica la app
 * problemas: [{ titulo, texto (HTML), boton?: { texto, accion }, enlace?: { texto, href }, contacto?: true }]
 *   (contacto: botón para contarlo por Gmail y la dirección de correo)
 * fuentes: [{ nombre, texto, url }]
 * pasos: los de la guía (ver guia.js) · antesDeLaGuia: por ejemplo, cerrar el panel del móvil
 */
export function iniciarAyuda({ app, paraQueSirve, problemas, fuentes, pasos, antesDeLaGuia = () => {} }) {
  const botones = [...document.querySelectorAll('[aria-controls="menu-ayuda"]')];
  const guia = crearGuia(pasos, { antesDeEmpezar: antesDeLaGuia });

  /* ---------- El desplegable ---------- */

  const menu = document.createElement('div');
  menu.className = 'menu-ayuda';
  menu.id = 'menu-ayuda';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Ayuda');
  menu.hidden = true;
  menu.innerHTML = `
    <p class="menu-ayuda__titulo" aria-hidden="true">¿En qué te ayudo?</p>
    <button type="button" class="menu-ayuda__opcion" role="menuitem" data-ayuda="problema">
      <span class="menu-ayuda__icono menu-ayuda__icono--problema">${icono('i-problema')}</span>
      <span class="menu-ayuda__textos"><strong>Tengo un problema</strong><small>Soluciones a lo que suele fallar</small></span>
    </button>
    <a class="menu-ayuda__opcion" role="menuitem" href="${paraQueSirve}">
      <span class="menu-ayuda__icono menu-ayuda__icono--info">${icono('i-info')}</span>
      <span class="menu-ayuda__textos"><strong>Para qué sirve la app</strong><small>Qué hace y cómo te ayuda a ahorrar</small></span>
    </a>
    <button type="button" class="menu-ayuda__opcion" role="menuitem" data-ayuda="fuentes">
      <span class="menu-ayuda__icono menu-ayuda__icono--fuentes">${icono('i-libro')}</span>
      <span class="menu-ayuda__textos"><strong>Fuentes</strong><small>De dónde salen los datos</small></span>
    </button>
    <button type="button" class="menu-ayuda__opcion" role="menuitem" data-ayuda="guia">
      <span class="menu-ayuda__icono menu-ayuda__icono--guia">${icono('i-guia')}</span>
      <span class="menu-ayuda__textos"><strong>Guía de uso</strong><small>Te enseño la página paso a paso</small></span>
    </button>`;
  document.body.append(menu);
  const opciones = [...menu.querySelectorAll('[role="menuitem"]')];
  let abiertoDesde = null;

  function colocarMenu() {
    if (!abiertoDesde) return;
    const caja = abiertoDesde.getBoundingClientRect();
    const ancho = Math.min(Math.max(caja.width, 300), window.innerWidth - 24);
    menu.style.width = `${ancho}px`;
    // Si el botón está a la derecha, el menú se alinea por la derecha
    const izquierda = caja.left + caja.width / 2 > window.innerWidth / 2 ? caja.right - ancho : caja.left;
    menu.style.left = `${Math.min(Math.max(12, izquierda), window.innerWidth - ancho - 12)}px`;
    const alto = menu.offsetHeight;
    let arriba = caja.bottom + 8;
    if (arriba + alto > window.innerHeight - 12) arriba = Math.max(12, caja.top - 8 - alto);
    menu.style.top = `${arriba}px`;
  }

  function abrirMenu(boton) {
    abiertoDesde = boton;
    menu.hidden = false;
    for (const b of botones) b.setAttribute('aria-expanded', String(b === boton));
    colocarMenu();
    opciones[0].focus({ preventScroll: true });
  }

  function cerrarMenu({ devolverFoco = false } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    for (const b of botones) b.setAttribute('aria-expanded', 'false');
    if (devolverFoco) abiertoDesde?.focus({ preventScroll: true });
    abiertoDesde = null;
  }

  for (const boton of botones) {
    boton.addEventListener('click', () => (abiertoDesde === boton ? cerrarMenu() : abrirMenu(boton)));
  }

  menu.addEventListener('click', (evento) => {
    const opcion = evento.target.closest('[data-ayuda]');
    if (!opcion) return; // el enlace de «Para qué sirve» va solo
    cerrarMenu();
    if (opcion.dataset.ayuda === 'problema') dialogoProblemas.showModal();
    if (opcion.dataset.ayuda === 'fuentes') dialogoFuentes.showModal();
    if (opcion.dataset.ayuda === 'guia') guia.empezar();
  });

  menu.addEventListener('keydown', (evento) => {
    const actual = opciones.indexOf(document.activeElement);
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      opciones[(actual + paso + opciones.length) % opciones.length].focus();
    } else if (evento.key === 'Home' || evento.key === 'End') {
      evento.preventDefault();
      opciones[evento.key === 'Home' ? 0 : opciones.length - 1].focus();
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrarMenu({ devolverFoco: true });
    } else if (evento.key === 'Tab') {
      cerrarMenu();
    }
  });

  // Tocar fuera lo cierra; al mover la página, el menú acompaña al botón
  document.addEventListener('pointerdown', (evento) => {
    if (!menu.hidden && !menu.contains(evento.target) && !botones.some((b) => b.contains(evento.target))) cerrarMenu();
  });
  window.addEventListener('scroll', colocarMenu, { passive: true });
  window.addEventListener('resize', () => cerrarMenu());

  /* ---------- Ventanas: «Tengo un problema» y «Fuentes» ---------- */

  const correo = enlacesCorreo(app);
  // name="problemas": al abrir uno se cierra el que estaba abierto (y abajo, lo mismo con JavaScript)
  const problemasHTML = `
    <p class="ayuda__intro">Toca lo que te pasa para ver cómo arreglarlo.</p>
    <div class="problemas">
      ${problemas.map((p, i) => `
        <details class="problema" name="problemas">
          <summary class="problema__resumen">
            <span>${p.titulo}</span>
            <span class="problema__flecha" aria-hidden="true">${icono('i-abajo')}</span>
          </summary>
          <div class="problema__cuerpo">
            ${p.texto}
            ${p.boton ? `<button type="button" class="boton boton--suave" data-problema="${i}">${p.boton.texto}</button>` : ''}
            ${p.enlace ? `<a class="boton boton--suave" href="${p.enlace.href}" target="_blank" rel="noopener">${p.enlace.texto}${icono('i-enlace')}</a>` : ''}
            ${p.contacto ? `
              <a class="boton boton--gmail" href="${correo.gmail}" target="_blank" rel="noopener">${icono('i-correo')}Contarlo por Gmail</a>
              <p class="problema__correo">¿No usas Gmail? Escribe a <a href="${correo.correo}">${CORREO}</a> desde tu app de correo.</p>` : ''}
          </div>
        </details>`).join('')}
    </div>`;

  const fuentesHTML = `
    <p class="ayuda__intro">La app no se inventa nada: estos son los datos oficiales que usa. Debajo de cada uno tienes el enlace para verlo tú.</p>
    <ul class="fuentes">
      ${fuentes.map((f) => `
        <li class="fuente">
          <p class="fuente__nombre">${f.nombre}</p>
          <p class="fuente__texto">${f.texto}</p>
          <a class="fuente__enlace" href="${f.url}" target="_blank" rel="noopener">${icono('i-enlace')}Visitar ${dominio(f.url)}</a>
        </li>`).join('')}
    </ul>`;

  const dialogoProblemas = crearDialogo('dialogo-problemas', 'Tengo un problema', problemasHTML);
  const dialogoFuentes = crearDialogo('dialogo-fuentes', 'Fuentes de los datos', fuentesHTML);

  // Solo un problema abierto a la vez: al abrir uno, se cierra el anterior
  // (los navegadores nuevos ya lo hacen con name="problemas"; esto es para los demás)
  dialogoProblemas.addEventListener('toggle', (evento) => {
    const abierto = evento.target;
    if (!abierto.matches?.('details.problema') || !abierto.open) return;
    for (const otro of dialogoProblemas.querySelectorAll('details.problema[open]')) {
      if (otro !== abierto) otro.open = false;
    }
    abierto.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, true);

  dialogoProblemas.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-problema]');
    if (!boton) return;
    dialogoProblemas.close();
    problemas[Number(boton.dataset.problema)].boton.accion();
  });

  // «?guia=1» en la dirección (desde la página «Para qué sirve»): empieza la guía sola
  const parametros = new URLSearchParams(location.search);
  if (parametros.has('guia')) {
    parametros.delete('guia');
    const resto = parametros.toString();
    history.replaceState(null, '', `${location.pathname}${resto ? `?${resto}` : ''}${location.hash}`);
    setTimeout(() => guia.empezar(), 900);
  }

  return { empezarGuia: () => guia.empezar() };
}

/** Una ventana (hoja) con título, contenido y botón «Cerrar» */
function crearDialogo(id, titulo, contenido) {
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo dialogo--hoja dialogo--ayuda';
  dialogo.id = id;
  dialogo.setAttribute('aria-labelledby', `${id}-titulo`);
  dialogo.innerHTML = `
    <div class="hoja">
      <header class="hoja__cabecera">
        <h2 class="hoja__titulo" id="${id}-titulo">${titulo}</h2>
        <button type="button" class="boton-icono hoja__cerrar" data-cerrar aria-label="Cerrar">${icono('i-cerrar')}</button>
      </header>
      <div class="hoja__cuerpo">${contenido}</div>
      <footer class="hoja__botones">
        <button type="button" class="boton" data-cerrar>Cerrar</button>
      </footer>
    </div>`;
  document.body.append(dialogo);
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo || evento.target.closest('[data-cerrar]')) dialogo.close();
  });
  return dialogo;
}
