/*
 * linea.js
 * ------------------------------------------------------------------
 * Gráfico de líneas en SVG para precios por días. Se puede usar varias
 * veces en la misma página (el de España y el de cada gasolinera):
 *
 *   const grafico = crearLinea({ caja, lectura });
 *   grafico.pintar(serie, { animar, fecha });   // serie: [{ fecha, precio }]
 *
 * Tocar o deslizar el dedo por encima enseña el precio de cada día.
 */

const formatoPrecio = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const formatoEje = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const formatoMes = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' });
const fechaUTC = (fecha) => new Date(`${fecha}T12:00:00Z`);
const prefiereMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let contador = 0; // para que cada gráfico tenga su propio degradado

/** caja: donde va el SVG · lectura: donde se escribe el precio del día tocado · variacion(): html de la diferencia */
export function crearLinea({ caja, lectura, variacion }) {
  const id = `degradado-${++contador}`;
  let datos = null;   // { serie, x, y, ancho, alto, margen }
  let elegido = null; // índice del día marcado

  function pintar(serie, { animar = false, fecha = null } = {}) {
    if (!serie.length) {
      datos = null;
      caja.innerHTML = '';
      lectura.innerHTML = '<span class="lectura-gas__fecha">No hay datos de estos días.</span>';
      return;
    }
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
    datos = { serie, x, y, ancho, alto, margen };

    // Líneas horizontales con precios redondos
    const paso = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2].find((p) => (maximo - minimo) / p <= 4) ?? 0.5;
    let rejilla = '';
    for (let v = Math.ceil(minimo / paso) * paso; v <= maximo; v += paso) {
      rejilla += `<line class="linea__rejilla" x1="${margen.izquierda}" x2="${ancho - margen.derecha}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="linea__texto" x="${margen.izquierda - 6}" y="${y(v) + 4}" text-anchor="end">${formatoEje.format(v)}</text>`;
    }

    // Nombre del mes donde empieza cada mes (o algunas fechas si la serie es corta)
    let marcas = '';
    const corta = serie.length <= 40;
    serie.forEach((dia, i) => {
      const dibujar = corta ? i % 7 === 0 : dia.fecha.endsWith('-01');
      if (dibujar && x(i) > margen.izquierda + 12 && x(i) < ancho - 16) {
        const texto = corta ? `${Number(dia.fecha.slice(8))} ${formatoMes.format(fechaUTC(dia.fecha)).replace('.', '')}` : formatoMes.format(fechaUTC(dia.fecha)).replace('.', '');
        marcas += `<line class="linea__rejilla" x1="${x(i)}" x2="${x(i)}" y1="${alto - margen.abajo}" y2="${alto - margen.abajo + 4}"/>
          <text class="linea__texto" x="${x(i)}" y="${alto - 6}" text-anchor="middle">${texto}</text>`;
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
          <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style="stop-color: var(--acento); stop-opacity: 0.22"/>
            <stop offset="1" style="stop-color: var(--acento); stop-opacity: 0"/>
          </linearGradient>
        </defs>
        ${rejilla}
        ${marcas}
        <path class="linea__area" d="${area}" fill="url(#${id})"/>
        <path class="linea__trazo" d="${trazo}"/>
        ${serie.length > 2 ? `
          <circle class="linea__extremo linea__extremo--min" cx="${x(iMin)}" cy="${y(precios[iMin])}" r="4.5"/>
          <circle class="linea__extremo linea__extremo--max" cx="${x(iMax)}" cy="${y(precios[iMax])}" r="4.5"/>` : ''}
        <g class="linea__marca">
          <line class="linea__cursor" y1="${margen.arriba}" y2="${alto - margen.abajo}"/>
          <circle class="linea__punto" r="6"/>
        </g>
      </svg>`;

    caja.style.setProperty('--largo', caja.querySelector('.linea__trazo').getTotalLength?.() ?? 1000);
    const indice = serie.findIndex((d) => d.fecha === fecha);
    elegir(indice >= 0 ? indice : serie.length - 1);
  }

  /** Marca un día y escribe su precio encima */
  function elegir(indice) {
    if (!datos) return;
    const { serie, x, y } = datos;
    elegido = Math.max(0, Math.min(serie.length - 1, indice));
    const dia = serie[elegido];
    const marca = caja.querySelector('.linea__marca');
    marca.querySelector('line').setAttribute('x1', x(elegido));
    marca.querySelector('line').setAttribute('x2', x(elegido));
    marca.querySelector('circle').setAttribute('cx', x(elegido));
    marca.querySelector('circle').setAttribute('cy', y(dia.precio));
    const ultimo = serie[serie.length - 1];
    const esUltimo = elegido === serie.length - 1;
    lectura.innerHTML = `
      <span class="lectura-gas__valor">${formatoPrecio.format(dia.precio)} <small>€/l</small></span>
      <span class="lectura-gas__fecha">${esUltimo ? 'Último día' : mayuscula(formatoLargo.format(fechaUTC(dia.fecha)))}</span>
      ${esUltimo ? '' : `<span class="lectura-gas__fecha">· ${variacion(dia.precio - ultimo.precio)} frente al último día</span>`}`;
  }

  // Tocar o deslizar el dedo por el gráfico
  let arrastrando = false;
  const elegirEn = (clientX) => {
    if (!datos) return;
    const { serie, ancho, margen } = datos;
    const r = caja.getBoundingClientRect();
    const xSvg = ((clientX - r.left) / r.width) * ancho;
    const indice = Math.round(((xSvg - margen.izquierda) / (ancho - margen.izquierda - margen.derecha)) * (serie.length - 1));
    if (indice !== elegido) elegir(indice);
  };
  caja.addEventListener('pointerdown', (e) => { arrastrando = e.pointerType !== 'mouse'; elegirEn(e.clientX); });
  caja.addEventListener('pointermove', (e) => { if (arrastrando || e.pointerType === 'mouse') elegirEn(e.clientX); });
  caja.addEventListener('pointerup', () => { arrastrando = false; });
  caja.addEventListener('pointercancel', () => { arrastrando = false; });
  caja.addEventListener('pointerleave', (e) => {
    arrastrando = false;
    if (e.pointerType === 'mouse' && datos) elegir(datos.serie.length - 1);
  });

  return { pintar };
}

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
