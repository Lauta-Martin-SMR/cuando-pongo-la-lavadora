/*
 * calendario.js
 * ------------------------------------------------------------------
 * Un calendario mensual que pinta cada día con un color según su precio.
 * Lo usan las dos apps: la luz (últimos 2 meses) y la gasolina (6 meses).
 *
 * Uso:
 *   const calendario = crearCalendario(caja, { alElegir: (fecha) => … });
 *   calendario.pintar({ dias, min, max, hoy, elegido, leyenda });
 *
 *   dias: Map 'AAAA-MM-DD' → { nivel: 'barata'|'media'|'cara', texto: '0,12', etiqueta: 'para lectores de pantalla' }
 */

import { icono } from './iconos.js';

const SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const formatoMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatoDia = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

const dos = (numero) => String(numero).padStart(2, '0');

function sumarMeses(mes, cuantos) {
  const [anio, numero] = mes.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, numero - 1 + cuantos, 1));
  return `${fecha.getUTCFullYear()}-${dos(fecha.getUTCMonth() + 1)}`;
}

export function crearCalendario(caja, { alElegir }) {
  let estado = null;
  let mes = null;           // mes que se está viendo, 'AAAA-MM'
  let ultimoElegido = null;
  let ultimoHTML = '';

  // Un solo «escuchador» para todos los botones del calendario
  caja.addEventListener('click', (evento) => {
    const dia = evento.target.closest('[data-fecha]');
    if (dia && !dia.disabled) {
      alElegir(dia.dataset.fecha);
      return;
    }
    const flecha = evento.target.closest('[data-mover]');
    if (flecha && !flecha.disabled) {
      mes = sumarMeses(mes, Number(flecha.dataset.mover));
      pintarMes();
    }
  });

  function pintar(nuevoEstado) {
    estado = nuevoEstado;
    // Si se ha elegido otro día, enseñamos su mes (si no, dejamos el mes que se esté viendo)
    if (!mes || estado.elegido !== ultimoElegido) mes = (estado.elegido ?? estado.hoy).slice(0, 7);
    ultimoElegido = estado.elegido;
    pintarMes();
  }

  function pintarMes() {
    const [anio, numero] = mes.split('-').map(Number);
    const primerDia = new Date(Date.UTC(anio, numero - 1, 1));
    const diasDelMes = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
    const huecos = (primerDia.getUTCDay() + 6) % 7; // la semana empieza en lunes

    let celdas = '<span></span>'.repeat(huecos);
    for (let dia = 1; dia <= diasDelMes; dia++) {
      const fecha = `${mes}-${dos(dia)}`;
      const info = estado.dias.get(fecha);
      const fuera = fecha < estado.min || fecha > estado.max;
      const nombre = formatoDia.format(new Date(`${fecha}T12:00:00Z`));
      const clases = ['calendario__dia', info ? `nivel--${info.nivel}` : '', fecha === estado.hoy ? 'calendario__dia--hoy' : '']
        .filter(Boolean).join(' ');
      celdas += `
        <button type="button" class="${clases}" data-fecha="${fecha}"
          aria-pressed="${fecha === estado.elegido}" ${fuera || !info ? 'disabled' : ''}
          aria-label="${nombre}${info ? `: ${info.etiqueta}` : ''}">
          ${dia}${info?.texto ? `<small>${info.texto}</small>` : ''}
        </button>`;
    }

    const html = `
      <div class="calendario__cabecera">
        <button type="button" class="boton-redondo" data-mover="-1" aria-label="Mes anterior"
          ${mes <= estado.min.slice(0, 7) ? 'disabled' : ''}>${icono('i-atras')}</button>
        <p class="calendario__mes" aria-live="polite">${formatoMes.format(primerDia)}</p>
        <button type="button" class="boton-redondo" data-mover="1" aria-label="Mes siguiente"
          ${mes >= estado.max.slice(0, 7) ? 'disabled' : ''}>${icono('i-flecha')}</button>
      </div>
      <div class="calendario__semana" aria-hidden="true">${SEMANA.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="calendario__dias">${celdas}</div>
      <p class="calendario__leyenda" aria-hidden="true">
        ${estado.leyenda?.izquierda ?? 'Más barato'}
        <i class="nivel--barata"></i><i class="nivel--media"></i><i class="nivel--cara"></i>
        ${estado.leyenda?.derecha ?? 'Más caro'}
      </p>`;
    // Solo cambiamos el HTML si es distinto (así no se pierde el foco al repintar)
    if (html !== ultimoHTML || !caja.querySelector('.calendario__dias')) {
      caja.innerHTML = html;
      ultimoHTML = html;
    }
  }

  return { pintar };
}

/** Mensaje en lugar del calendario (cargando, error…) */
export function mensajeCalendario(caja, html) {
  caja.innerHTML = `<div class="calendario__estado">${html}</div>`;
}

/**
 * Reparte los días en tres niveles por tercios: el tercio más barato es
 * «barata», el más caro «cara» y el resto «media».
 * valores: Map fecha → número. Devuelve Map fecha → nivel.
 */
export function nivelesPorTercios(valores) {
  const ordenados = [...valores.values()].sort((a, b) => a - b);
  const bajo = ordenados[Math.floor((ordenados.length - 1) / 3)];
  const alto = ordenados[Math.floor(((ordenados.length - 1) * 2) / 3)];
  const niveles = new Map();
  for (const [fecha, valor] of valores) {
    niveles.set(fecha, valor <= bajo ? 'barata' : valor > alto ? 'cara' : 'media');
  }
  return niveles;
}
