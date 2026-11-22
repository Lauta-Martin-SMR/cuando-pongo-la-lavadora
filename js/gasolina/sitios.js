/*
 * sitios.js
 * ------------------------------------------------------------------
 * «Mis sitios»: los sitios donde sueles repostar (tu pueblo, el trabajo, una
 * marca, una gasolinera concreta…). Se añaden escribiendo (con sugerencias)
 * o guardando lo que se está viendo en el mapa, y con un toque el mapa los busca.
 *
 * En pantallas anchas el cuadro va en la columna de la derecha. En el móvil,
 * el botón «Mis sitios» de la esquina derecha del mapa lo abre encima del mapa.
 *
 * Cada sitio: { nombre, detalle, zona: { tipo, valor, nombre }, marca?, estacion? }
 */

import { icono } from '../comun/iconos.js';

const CLAVE = 'cuando-lavadora:sitios';
const MAXIMO = 12;
const escritorio = window.matchMedia('(min-width: 1280px)');

const idDe = (s) => `${s.zona?.tipo}|${s.zona?.valor ?? ''}|${s.marca ?? ''}|${s.estacion ?? ''}`;
const ICONO_TIPO = { municipio: 'i-lugar', provincia: 'i-lugar', cp: 'i-correo', espana: 'i-surtidor' };

function leer() {
  try {
    const lista = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(lista) ? lista.filter((s) => s?.nombre && s?.zona?.tipo).slice(0, MAXIMO) : [];
  } catch {
    return [];
  }
}

function guardar(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // navegación privada: duran hasta cerrar la página
  }
}

/** Escapa el texto antes de meterlo en el HTML (los nombres vienen de los datos) */
const texto = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * huecos: { lateral, mapa, vacio } → dónde va el cuadro en el escritorio, en el móvil
 *         (encima del mapa) y los accesos rápidos de la pantalla vacía del mapa
 * boton: el botón «Mis sitios» del mapa (móvil)
 * buscar(texto): Promise con sugerencias del buscador
 * deSugerencia(s): convierte una sugerencia en un sitio
 * actual(): el sitio de lo que se ve ahora en el mapa (o null)
 * alElegir(sitio): enseña ese sitio en el mapa
 */
export function crearSitios({ huecos, boton, buscar, deSugerencia, actual, alElegir }) {
  let sitios = leer();
  let sugeridas = [];

  const caja = document.createElement('section');
  caja.className = 'sitios';
  caja.id = 'sitios';
  caja.setAttribute('aria-labelledby', 'sitios-titulo');
  caja.innerHTML = `
    <div class="sitios__cabecera">
      <h2 class="sitios__titulo" id="sitios-titulo"><span class="sitios__icono">${icono('i-marcador')}</span>Mis sitios</h2>
      <button type="button" class="boton-icono sitios__cerrar" aria-label="Cerrar «Mis sitios»">${icono('i-cerrar')}</button>
    </div>
    <p class="sitios__texto">Guarda los sitios donde sueles repostar. Con un toque, el mapa los busca.</p>
    <form class="sitios__nuevo" autocomplete="off">
      <span class="sitios__caja">
        ${icono('i-lupa')}
        <input type="text" class="sitios__entrada" placeholder="Pueblo, CP o marca" aria-label="Sitio que quieres añadir"
          enterkeyhint="done" spellcheck="false" autocomplete="off">
      </span>
      <button type="submit" class="boton sitios__anadir" aria-label="Añadir a mis sitios" title="Añadir a mis sitios">${icono('i-mas')}<span>Añadir</span></button>
    </form>
    <ul class="sitios__sugerencias" aria-label="Sugerencias" hidden></ul>
    <p class="sitios__aviso" role="status"></p>
    <button type="button" class="sitios__actual" hidden></button>
    <ul class="sitios__lista" aria-label="Tus sitios"></ul>
    <p class="sitios__vacio">Todavía no tienes sitios guardados.</p>`;

  const entrada = caja.querySelector('.sitios__entrada');
  const listaSugerencias = caja.querySelector('.sitios__sugerencias');
  const aviso = caja.querySelector('.sitios__aviso');

  /* ---------- Dónde va el cuadro ---------- */

  function colocar() {
    const enEscritorio = escritorio.matches;
    (enEscritorio ? huecos.lateral : huecos.mapa).append(caja);
    caja.classList.toggle('sitios--flotante', !enEscritorio);
    if (enEscritorio) cerrar();
  }
  escritorio.addEventListener('change', colocar);

  function abrir() {
    huecos.mapa.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    entrada.focus({ preventScroll: true });
  }

  function cerrar() {
    huecos.mapa.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
  }

  boton.addEventListener('click', () => (huecos.mapa.hidden ? abrir() : cerrar()));
  caja.querySelector('.sitios__cerrar').addEventListener('click', () => {
    cerrar();
    boton.focus({ preventScroll: true });
  });
  caja.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !escritorio.matches) {
      cerrar();
      boton.focus({ preventScroll: true });
    }
  });

  /* ---------- Añadir ---------- */

  function anadir(sitio) {
    if (!sitio) return;
    const id = idDe(sitio);
    if (sitios.some((s) => idDe(s) === id)) {
      avisar(`«${sitio.nombre}» ya está en tus sitios.`);
      return;
    }
    if (sitios.length >= MAXIMO) {
      avisar(`Caben ${MAXIMO} sitios. Quita alguno para añadir otro.`);
      return;
    }
    sitios = [sitio, ...sitios];
    guardar(sitios);
    entrada.value = '';
    pintarSugerencias([]);
    avisar(`Añadido: ${sitio.nombre}. Tócalo para verlo en el mapa.`);
    pintar();
    navigator.vibrate?.(8);
  }

  let temporizadorAviso;
  function avisar(mensaje) {
    aviso.textContent = mensaje;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { aviso.textContent = ''; }, 5000);
  }

  function pintarSugerencias(lista) {
    sugeridas = lista;
    listaSugerencias.hidden = !lista.length;
    listaSugerencias.innerHTML = lista.map((s, i) => `
      <li>
        <button type="button" class="sitios__sugerencia" data-sugerencia="${i}">
          <strong>${texto(s.texto)}</strong><small>${texto(s.detalle)}</small>
        </button>
      </li>`).join('');
  }

  let espera;
  entrada.addEventListener('input', () => {
    clearTimeout(espera);
    const escrito = entrada.value;
    espera = setTimeout(async () => {
      if (escrito.trim().length < 2) return pintarSugerencias([]);
      const lista = await buscar(escrito);
      if (entrada.value === escrito) pintarSugerencias(lista.slice(0, 5));
    }, 150);
  });

  caja.querySelector('.sitios__nuevo').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const escrito = entrada.value.trim();
    if (escrito.length < 2) {
      avisar('Escribe un pueblo, un código postal o una marca.');
      entrada.focus();
      return;
    }
    const lista = sugeridas.length ? sugeridas : await buscar(escrito);
    if (!lista.length) {
      avisar(`No encontramos gasolineras para «${escrito}».`);
      return;
    }
    anadir(deSugerencia(lista[0]));
  });

  listaSugerencias.addEventListener('click', (evento) => {
    const opcion = evento.target.closest('[data-sugerencia]');
    if (opcion) anadir(deSugerencia(sugeridas[Number(opcion.dataset.sugerencia)]));
  });

  caja.querySelector('.sitios__actual').addEventListener('click', () => anadir(actual()));

  /* ---------- Elegir y quitar ---------- */

  function elegir(indice) {
    const sitio = sitios[indice];
    if (!sitio) return;
    if (!escritorio.matches) cerrar();
    alElegir(sitio);
    navigator.vibrate?.(8);
  }

  caja.querySelector('.sitios__lista').addEventListener('click', (evento) => {
    const quitar = evento.target.closest('[data-quitar]');
    if (quitar) {
      const quitado = sitios[Number(quitar.dataset.quitar)];
      sitios = sitios.filter((_, i) => i !== Number(quitar.dataset.quitar));
      guardar(sitios);
      avisar(`Quitado: ${quitado.nombre}.`);
      pintar();
      return;
    }
    const ir = evento.target.closest('[data-ir]');
    if (ir) elegir(Number(ir.dataset.ir));
  });

  huecos.vacio.addEventListener('click', (evento) => {
    const ir = evento.target.closest('[data-ir]');
    if (ir) elegir(Number(ir.dataset.ir));
  });

  /* ---------- Pintar ---------- */

  function pintar() {
    const ahora = actual();
    const idAhora = ahora ? idDe(ahora) : null;

    const guardarActual = caja.querySelector('.sitios__actual');
    const yaEsta = idAhora && sitios.some((s) => idDe(s) === idAhora);
    guardarActual.hidden = !ahora || yaEsta;
    if (ahora && !yaEsta) guardarActual.innerHTML = `${icono('i-estrella')}<span>Guardar lo que veo: <strong>${texto(ahora.nombre)}</strong></span>`;

    caja.querySelector('.sitios__lista').innerHTML = sitios.map((s, i) => `
      <li class="sitio">
        <button type="button" class="sitio__ir" data-ir="${i}" ${idDe(s) === idAhora ? 'aria-current="true"' : ''}>
          <span class="sitio__icono">${icono(s.estacion ? 'i-surtidor' : s.marca ? 'i-estrella' : ICONO_TIPO[s.zona.tipo] ?? 'i-lugar')}</span>
          <span class="sitio__textos"><strong>${texto(s.nombre)}</strong><small>${texto(s.detalle ?? '')}</small></span>
        </button>
        <button type="button" class="sitio__quitar" data-quitar="${i}" aria-label="Quitar ${texto(s.nombre)}">${icono('i-cerrar')}</button>
      </li>`).join('');
    caja.querySelector('.sitios__vacio').hidden = sitios.length > 0;

    // En la pantalla vacía del mapa, tus sitios van primero
    huecos.vacio.hidden = !sitios.length;
    huecos.vacio.innerHTML = sitios.length ? `
      <p class="mapa__mis-sitios-titulo">${icono('i-marcador')}Tus sitios</p>
      <div class="mapa__mis-sitios-lista">
        ${sitios.map((s, i) => `<button type="button" class="chip chip--sitio" data-ir="${i}">${texto(s.nombre)}</button>`).join('')}
      </div>` : '';

    boton.querySelector('.sitios-abrir__numero').textContent = sitios.length ? String(sitios.length) : '';
  }

  colocar();
  pintar();
  return { pintar, abrir, cerrar };
}
