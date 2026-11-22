/*
 * interfaz.js (gasolina)
 * ------------------------------------------------------------------
 * Pinta la app de la gasolina con los datos que le pasa app.js.
 * Igual que en la app de la luz, solo metemos en el HTML textos nuestros
 * y números ya formateados.
 */

import { icono } from '../comun/iconos.js';

const formatoPrecio = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const formatoEje = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formatoLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const formatoCorto = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const formatoMes = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' });

const NOMBRE_NIVEL = { barata: 'Barata', media: 'Normal', cara: 'Cara' };

export const precio = (valor) => formatoPrecio.format(valor);          // 1.5501 → "1,550"
const euros = (valor) => formatoEuros.format(valor);                    // 62 → "62,00 €"
const fechaUTC = (fecha) => new Date(`${fecha}T12:00:00Z`);
const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
export const fechaLarga = (fecha) => mayuscula(formatoLargo.format(fechaUTC(fecha)));
export const fechaCorta = (fecha) => formatoCorto.format(fechaUTC(fecha)).replace('.', '');
const $ = (selector) => document.querySelector(selector);
const prefiereMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Diferencia en céntimos con su flecha: «▲ 1,8 cént.» */
export function variacionHTML(diferencia, { conTexto = false } = {}) {
  const centimos = Math.abs(diferencia * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  if (Math.abs(diferencia) < 0.0005) return `<span class="variacion variacion--igual">= igual${conTexto ? ' que hace una semana' : ''}</span>`;
  const sube = diferencia > 0;
  return `<span class="variacion variacion--${sube ? 'sube' : 'baja'}">${icono(sube ? 'i-sube' : 'i-baja')}${sube ? '+' : '−'}${centimos} cént.</span>`;
}


/* ---------- 1. Carburantes ---------- */

/**
 * lista: [{ id, nombre, precio, semana (diferencia con hace 7 días), puntos (últimos 30 días) }]
 */
export function pintarCarburantes(lista, elegido) {
  $('#carburantes').innerHTML = lista.map((c) => `
    <button type="button" class="carburante" data-id="${c.id}" aria-pressed="${c.id === elegido}"
      aria-label="${c.nombre}: ${precio(c.precio)} euros el litro">
      <span class="carburante__nombre">${c.nombre}</span>
      <span class="carburante__precio">${precio(c.precio)}<small>€/l</small></span>
      ${variacionHTML(c.semana)}
      ${minilinea(c.puntos)}
    </button>`).join('');
}

/** Mini gráfico (sin ejes) con los últimos días */
function minilinea(puntos) {
  const minimo = Math.min(...puntos);
  const maximo = Math.max(...puntos);
  const rango = maximo - minimo || 1;
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${((i / (puntos.length - 1)) * 100).toFixed(1)} ${(26 - ((p - minimo) / rango) * 24).toFixed(1)}`).join(' ');
  return `<svg class="minilinea" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}

export function marcarCarburante(id) {
  for (const boton of document.querySelectorAll('.carburante')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.id === id));
  }
}


/* ---------- 2. Precio de hoy ---------- */

export function pintarDestacado({ carburante, hoy, semana, mes, nivel, resumen, tendencia }) {
  const caja = $('#destacado');
  caja.className = `tarjeta destacado nivel--${nivel}`;

  const consejos = {
    barata: 'Buen momento para llenar el depósito: está por debajo de la media de los últimos 6 meses.',
    media: 'Precio normal comparado con los últimos 6 meses.',
    cara: 'Está más cara que la media de los últimos 6 meses. Si puedes, echa solo lo que necesites.',
  };
  const rumbo = Math.abs(tendencia.porDia) < 0.0002 ? 'estable' : tendencia.porDia > 0 ? 'subiendo' : 'bajando';

  caja.innerHTML = `
    <div class="destacado__arriba">
      <p class="destacado__titulo"><strong>${carburante.nombre}</strong> · hoy, ${fechaCorta(hoy.fecha)}</p>
      <span class="etiqueta nivel--${nivel}">${NOMBRE_NIVEL[nivel]}</span>
    </div>
    <p class="destacado__precio">${precio(hoy.precio)}<span class="destacado__unidad">€/l</span></p>
    <div class="destacado__cambios">
      <span class="cambio"><small>En una semana</small>${variacionHTML(semana)}</span>
      <span class="cambio"><small>En un mes</small>${variacionHTML(mes)}</span>
      <span class="cambio"><small>Tendencia</small><strong>${mayuscula(rumbo)}</strong></span>
    </div>
    <p class="destacado__texto">${consejos[nivel]}</p>
    <div class="destacado__extremos">
      <button type="button" class="extremo" data-fecha="${resumen.minimo.fecha}">
        Mínimo en 6 meses<strong>${precio(resumen.minimo.precio)} €/l</strong>${fechaCorta(resumen.minimo.fecha)}
      </button>
      <button type="button" class="extremo" data-fecha="${resumen.maximo.fecha}">
        Máximo en 6 meses<strong>${precio(resumen.maximo.precio)} €/l</strong>${fechaCorta(resumen.maximo.fecha)}
      </button>
    </div>`;
}


/* ---------- 3. Calculadora ---------- */

export function pintarCalculadora({ litros, hoy, esperado, haceUnMes }) {
  $('#litros').value = litros;
  $('#litros').style.setProperty('--progreso', `${((litros - 5) / 95) * 100}%`);
  $('#litros-valor').textContent = `${litros} litros`;
  for (const chip of document.querySelectorAll('[data-litros]')) {
    chip.setAttribute('aria-pressed', String(Number(chip.dataset.litros) === litros));
  }

  const diferencia = litros * (esperado - hoy.precio);
  const textoEsperado = Math.abs(diferencia) < 0.05
    ? 'Se espera que siga más o menos igual.'
    : `Si la tendencia sigue, dentro de una semana te costaría ${euros(Math.abs(diferencia))} ${diferencia > 0 ? 'más' : 'menos'}.`;

  $('#calculadora').innerHTML = `
    <div class="coste">
      <div class="coste__dato">
        <span class="coste__valor">${euros(litros * hoy.precio)}</span>
        <span class="coste__texto">hoy, a ${precio(hoy.precio)} €/l</span>
      </div>
      <div class="coste__dato coste__dato--esperado">
        <span class="coste__valor">${euros(litros * esperado)}</span>
        <span class="coste__texto">esperado en 7 días (${precio(esperado)} €/l)</span>
      </div>
    </div>
    <p class="calculadora__extra">${textoEsperado} Hace un mes habrías pagado ${euros(litros * haceUnMes.precio)}.</p>`;
}


/* ---------- 4. Gráfico de líneas ---------- */

let datosLinea = null;
let puntoElegido = null;

/**
 * serie: días a dibujar · animar: dibujar la línea poco a poco
 * fecha: día que se marca al principio (el elegido en el calendario); si no, hoy
 */
export function pintarLinea(serie, { animar = false, fecha = null } = {}) {
  datosLinea = { serie };
  puntoElegido = null;
  const caja = $('#grafico-gas');
  const ancho = Math.max(260, caja.clientWidth || 320);
  const alto = 190;
  const margen = { izquierda: 34, derecha: 8, arriba: 10, abajo: 24 };

  const precios = serie.map((d) => d.precio);
  let minimo = Math.min(...precios);
  let maximo = Math.max(...precios);
  const holgura = (maximo - minimo) * 0.15 || 0.02;
  minimo -= holgura;
  maximo += holgura;

  const x = (i) => margen.izquierda + (i / Math.max(1, serie.length - 1)) * (ancho - margen.izquierda - margen.derecha);
  const y = (p) => margen.arriba + (1 - (p - minimo) / (maximo - minimo)) * (alto - margen.arriba - margen.abajo);
  datosLinea = { serie, x, y, ancho, alto, margen };

  // Líneas horizontales con precios redondos
  const paso = [0.01, 0.02, 0.05, 0.1, 0.2].find((p) => (maximo - minimo) / p <= 4) ?? 0.5;
  let rejilla = '';
  for (let v = Math.ceil(minimo / paso) * paso; v <= maximo; v += paso) {
    rejilla += `<line class="linea__rejilla" x1="${margen.izquierda}" x2="${ancho - margen.derecha}" y1="${y(v)}" y2="${y(v)}"/>
      <text class="linea__texto" x="${margen.izquierda - 6}" y="${y(v) + 4}" text-anchor="end">${formatoEje.format(v)}</text>`;
  }

  // Nombre del mes donde empieza cada mes
  let meses = '';
  serie.forEach((dia, i) => {
    if (dia.fecha.endsWith('-01') && x(i) > margen.izquierda + 12 && x(i) < ancho - 16) {
      meses += `<line class="linea__rejilla" x1="${x(i)}" x2="${x(i)}" y1="${alto - margen.abajo}" y2="${alto - margen.abajo + 4}"/>
        <text class="linea__texto" x="${x(i)}" y="${alto - 6}" text-anchor="middle">${formatoMes.format(fechaUTC(dia.fecha)).replace('.', '')}</text>`;
    }
  });

  const trazo = serie.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.precio).toFixed(1)}`).join(' ');
  const area = `${trazo} L${x(serie.length - 1).toFixed(1)} ${alto - margen.abajo} L${x(0).toFixed(1)} ${alto - margen.abajo} Z`;
  const iMin = precios.indexOf(Math.min(...precios));
  const iMax = precios.indexOf(Math.max(...precios));

  caja.classList.toggle('linea--dibujando', animar && !prefiereMenosMovimiento());
  caja.innerHTML = `
    <svg viewBox="0 0 ${ancho} ${alto}" height="${alto}" aria-hidden="true">
      <defs>
        <linearGradient id="degradado-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style="stop-color: var(--acento); stop-opacity: 0.22"/>
          <stop offset="1" style="stop-color: var(--acento); stop-opacity: 0"/>
        </linearGradient>
      </defs>
      ${rejilla}
      ${meses}
      <path class="linea__area" d="${area}"/>
      <path class="linea__trazo" d="${trazo}"/>
      <circle class="linea__extremo linea__extremo--min" cx="${x(iMin)}" cy="${y(precios[iMin])}" r="4.5"/>
      <circle class="linea__extremo linea__extremo--max" cx="${x(iMax)}" cy="${y(precios[iMax])}" r="4.5"/>
      <g class="linea__marca">
        <line class="linea__cursor" y1="${margen.arriba}" y2="${alto - margen.abajo}"/>
        <circle class="linea__punto" r="6"/>
      </g>
    </svg>`;

  const largo = caja.querySelector('.linea__trazo').getTotalLength?.() ?? 1000;
  caja.style.setProperty('--largo', largo);
  const indice = serie.findIndex((d) => d.fecha === fecha);
  elegirPunto(indice >= 0 ? indice : serie.length - 1);
}

/** Marca un día del gráfico y escribe su precio encima */
function elegirPunto(indice) {
  if (!datosLinea) return;
  const { serie, x, y } = datosLinea;
  puntoElegido = Math.max(0, Math.min(serie.length - 1, indice));
  const dia = serie[puntoElegido];
  const marca = $('#grafico-gas .linea__marca');
  marca.querySelector('line').setAttribute('x1', x(puntoElegido));
  marca.querySelector('line').setAttribute('x2', x(puntoElegido));
  marca.querySelector('circle').setAttribute('cx', x(puntoElegido));
  marca.querySelector('circle').setAttribute('cy', y(dia.precio));
  const ultimo = serie[serie.length - 1];
  const diferencia = dia.precio - ultimo.precio;
  $('#lectura-gas').innerHTML = `
    <span class="lectura-gas__valor">${precio(dia.precio)} <small>€/l</small></span>
    <span class="lectura-gas__fecha">${puntoElegido === serie.length - 1 ? 'Hoy' : fechaLarga(dia.fecha)}</span>
    ${puntoElegido === serie.length - 1 ? '' : `<span class="lectura-gas__fecha">· ${variacionHTML(diferencia)} frente a hoy</span>`}`;
}

/** Tocar o deslizar el dedo por el gráfico enseña el precio de cada día */
export function iniciarGestosLinea() {
  const caja = $('#grafico-gas');
  let arrastrando = false;
  const elegirEn = (clientX) => {
    if (!datosLinea) return;
    const { serie, ancho, margen } = datosLinea;
    const r = caja.getBoundingClientRect();
    const xSvg = ((clientX - r.left) / r.width) * ancho;
    const proporcion = (xSvg - margen.izquierda) / (ancho - margen.izquierda - margen.derecha);
    const indice = Math.round(proporcion * (serie.length - 1));
    if (indice !== puntoElegido) elegirPunto(indice);
  };
  caja.addEventListener('pointerdown', (e) => { arrastrando = e.pointerType !== 'mouse'; elegirEn(e.clientX); });
  caja.addEventListener('pointermove', (e) => { if (arrastrando || e.pointerType === 'mouse') elegirEn(e.clientX); });
  caja.addEventListener('pointerup', () => { arrastrando = false; });
  caja.addEventListener('pointercancel', () => { arrastrando = false; });
  caja.addEventListener('pointerleave', (e) => {
    arrastrando = false;
    if (e.pointerType === 'mouse' && datosLinea) elegirPunto(datosLinea.serie.length - 1);
  });
}

export function marcarPeriodo(dias) {
  for (const boton of document.querySelectorAll('[data-periodo]')) {
    boton.setAttribute('aria-pressed', String(Number(boton.dataset.periodo) === dias));
  }
}


/* ---------- 5. Día elegido en el calendario ---------- */

export function pintarDiaElegido({ carburante, dia, hoy, litros }) {
  const diferencia = dia.precio - hoy.precio;
  const esHoy = dia.fecha === hoy.fecha;
  const porcentaje = Math.abs((diferencia / hoy.precio) * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  $('#dia-elegido').innerHTML = `
    <p class="dia-elegido__fecha">${fechaLarga(dia.fecha)}</p>
    <p class="dia-elegido__precio">${precio(dia.precio)} <small>€/l · ${carburante.nombre}</small></p>
    <p class="dia-elegido__texto">${esHoy
      ? `Es el precio de hoy. Llenar ${litros} litros cuesta ${euros(litros * dia.precio)}.`
      : `${variacionHTML(diferencia)} (un ${porcentaje} %) frente a hoy. Llenar ${litros} litros ese día costaba ${euros(litros * dia.precio)}.`}</p>`;
}

export function pintarFecha(texto) {
  $('#fecha').textContent = texto;
}

export function pintarEstado(texto) {
  $('#estado').textContent = texto;
  $('#estado').hidden = !texto;
}

export function pintarError(mensaje) {
  $('#destacado').className = 'tarjeta destacado';
  $('#destacado').innerHTML = `
    <p class="destacado__titulo"><strong>No hemos podido cargar los precios</strong></p>
    <p class="destacado__texto">${mensaje}</p>
    <button type="button" class="boton" data-accion="reintentar" style="margin-top:14px">Reintentar</button>`;
}

export function irA(selector) {
  $(selector).scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth', block: 'center' });
}
