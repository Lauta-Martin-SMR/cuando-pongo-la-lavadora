/*
 * interfaz.js
 * ------------------------------------------------------------------
 * Todo lo que se ve en pantalla en la app de la luz. app.js le pasa los
 * datos ya calculados y aquí se convierten en HTML. Este archivo no
 * descarga nada ni hace las cuentas importantes.
 *
 * Usamos plantillas de texto (`…${valor}…`) con innerHTML porque se leen
 * fácil. Es seguro porque solo metemos textos nuestros y números que ya
 * hemos formateado, nunca texto que venga de fuera tal cual.
 */

import { ZONA_HORARIA, fechaEnEspana } from './calculos.js';
import { NOMBRE_PERIODO, NOMBRE_TIPO, ZONAS, OFICIAL } from './tarifas.js';
import { icono } from '../comun/iconos.js';


/* ---------- Formatos en español ---------- */

const formatoPrecio = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const formatoEje = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
let formatoHora;
let formatoFecha;
let zonaHoraria = ZONA_HORARIA;

/**
 * Las horas se enseñan en la hora de la persona: la de la península o, en
 * Canarias, la canaria (una hora menos). Los días de precios siguen siendo los de REE.
 */
export function usarZonaHoraria(zona = ZONA_HORARIA) {
  zonaHoraria = zona;
  formatoHora = new Intl.DateTimeFormat('es-ES', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  formatoFecha = new Intl.DateTimeFormat('es-ES', { timeZone: zona, weekday: 'long', day: 'numeric', month: 'long' });
  ultimoHTML.clear(); // hay que volver a escribir todas las horas
}

const NOMBRE_NIVEL = { barata: 'Barata', media: 'Media', cara: 'Cara' };

/** 0.14345 → "0,143" */
export const precio = (valor) => formatoPrecio.format(valor);
/** Date → "14:00" (hora peninsular) */
const hora = (fecha) => formatoHora.format(fecha);
/** Date → "las 14:00" o "la 01:00" */
const laHora = (fecha) => (hora(fecha).startsWith('01:') ? 'la ' : 'las ') + hora(fecha);
/** 0.44 → "44 %" (con un espacio que no se separa del número) */
const porcentaje = (valor) => `${Math.round(valor * 100)} %`;
/** 0.384 → "0,38 €" (y «< 0,01 €» si es casi nada) */
const euros = (valor) => (valor < 0.005 ? '< 0,01 €' : formatoEuros.format(valor));
/** 0.06 → "0,06 kW" */
export const textoPotencia = (kw) => `${kw.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kW`;
const textoKWh = (kWh) => `${kWh.toLocaleString('es-ES', { maximumFractionDigits: kWh < 1 ? 2 : 1 })} kWh`;
const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

const $ = (selector) => document.querySelector(selector);

/** 120 → "2 h", 90 → "1,5 h", 20 → "20 min", 75 → "1 h 15 min" */
export function textoDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  if (minutos % 30 === 0) return `${(minutos / 60).toLocaleString('es-ES')} h`;
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

/** Milisegundos → "5 h 30 min" (redondeado a 5 minutos) */
function textoTiempo(milisegundos) {
  const total = Math.max(5, Math.round(milisegundos / 60000 / 5) * 5);
  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  if (horas === 0) return `${minutos} min`;
  return minutos === 0 ? `${horas} h` : `${horas} h ${minutos} min`;
}

// Solo cambiamos el HTML de una caja si es distinto del que ya tiene:
// así no parpadea ni se pierde el foco cuando la app repinta cada cuarto de hora.
const ultimoHTML = new Map();
function ponerHTML(elemento, html) {
  if (ultimoHTML.get(elemento) === html) return false;
  ultimoHTML.set(elemento, html);
  elemento.innerHTML = html;
  return true;
}

usarZonaHoraria();

/** 0.0844 → "0,0844" (con los decimales que haga falta) */
const cifra = (valor, decimales) => valor.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
const formatoDiaCorto = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
/** 'AAAA-MM-DD' → «sábado 28 de noviembre» */
const diaCorto = (fecha) => formatoDiaCorto.format(new Date(`${fecha}T12:00:00Z`)).replace(',', '');

const prefiereMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const editando = () => document.body.classList.contains('editando');


/* ---------- Arranque: botones y gestos ---------- */

/**
 * Conecta los botones con las funciones de app.js. `acciones` trae:
 * alElegirElectro, alCambiarDuracion, alCambiarPotencia, alCambiarDia,
 * alVerHora, alReintentar, alInstalar.
 */
export function iniciar(acciones) {
  // Aparatos (los de la pantalla principal y los de «Más»): un solo «escuchador» para todos
  for (const rejilla of [$('#electros'), $('#electros-mas')]) {
    rejilla.addEventListener('click', (evento) => {
      const boton = evento.target.closest('.electro');
      if (!boton || editando()) return;
      acciones.alElegirElectro(boton.dataset.id, rejilla.id === 'electros-mas');
    });
  }

  $('#boton-mas').addEventListener('click', () => abrirMas(!masAbierto()));

  $('#duracion-menos').addEventListener('click', () => acciones.alCambiarDuracion(-1));
  $('#duracion-mas').addEventListener('click', () => acciones.alCambiarDuracion(+1));
  $('#potencia-menos').addEventListener('click', () => acciones.alCambiarPotencia(-1));
  $('#potencia-mas').addEventListener('click', () => acciones.alCambiarPotencia(+1));

  for (const pestana of document.querySelectorAll('.pestana[data-dia]')) {
    pestana.addEventListener('click', () => acciones.alCambiarDia(pestana.dataset.dia));
  }

  $('#ver-manana').addEventListener('click', () => {
    acciones.alCambiarDia('manana');
    irAlGrafico();
  });

  // Tarjeta de ahora: «Reintentar» (si hubo error) y «Próximas horas»
  $('#ahora').addEventListener('click', (evento) => {
    if (evento.target.closest('[data-accion="reintentar"]')) acciones.alReintentar();
    if (evento.target.closest('.ahora__mas')) {
      proximasAbiertas = !proximasAbiertas;
      if (ultimoAhora) pintarAhora(ultimoAhora);
    }
  });

  // Tocar una de las horas baratas la enseña en el gráfico
  $('#baratas').addEventListener('click', (evento) => {
    const tarjeta = evento.target.closest('[data-inicio]');
    if (tarjeta) acciones.alVerHora(Number(tarjeta.dataset.inicio));
  });

  // Tocar «Mínimo» o «Máximo» marca esa hora en el gráfico
  $('#resumen').addEventListener('click', (evento) => {
    const dato = evento.target.closest('[data-inicio]');
    if (dato) elegirHora(Number(dato.dataset.inicio));
  });

  $('#boton-instalar').addEventListener('click', () => acciones.alInstalar());

  // Tu tarifa: «Cambiar», el interruptor de impuestos y los botones que llevan a una parte del formulario
  $('#cambiar-tarifa').addEventListener('click', () => acciones.alAbrirTarifa());
  $('#interruptor-impuestos').addEventListener('click', () => acciones.alCambiarImpuestos());
  $('#ir-claves').addEventListener('click', () => {
    $('#claves').scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth', block: 'start' });
  });
  document.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-abrir-tarifa]');
    if (!boton || editando()) return;
    if (boton.dataset.abrirTarifa === 'impuestos') acciones.alCambiarImpuestos();
    else acciones.alAbrirTarifa(boton.dataset.abrirTarifa);
  });

  iniciarGestosDelGrafico();

  // Si cambia el ancho (girar el móvil), repintamos el gráfico para recolocar las horas
  let espera;
  window.addEventListener('resize', () => {
    clearTimeout(espera);
    espera = setTimeout(() => datosGrafico && pintarGrafico({ ...datosGrafico, animar: false }), 150);
  });
}

export function irAlGrafico() {
  $('#bloque-grafico').scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth', block: 'start' });
}


/* ---------- Cabecera, errores y avisos ---------- */

export function pintarFecha(ahora) {
  $('#fecha').textContent = mayuscula(formatoFecha.format(ahora)); // "Domingo, 22 de noviembre"
}

export function pintarError(mensaje) {
  const caja = $('#ahora');
  caja.className = 'tarjeta ahora ahora--error';
  ponerHTML(caja, `
    ${icono('i-enchufe', 'icono vacio__icono')}
    <p class="ahora__titulo-error">No hemos podido cargar los precios</p>
    <p class="vacio__texto">${mensaje}</p>
    <button type="button" class="boton" data-accion="reintentar">Reintentar</button>`);
  document.body.classList.add('sin-datos');
}

/** Texto pequeño del pie (sin conexión, etc.). Vacío = se oculta. */
export function pintarEstado(texto) {
  $('#estado').textContent = texto;
  $('#estado').hidden = !texto;
}

/** modo: 'boton' (Android, ordenador), 'ios' (instrucciones para iPhone) o null */
export function mostrarInstalar(modo) {
  $('#instalar').hidden = !modo;
  $('#boton-instalar').hidden = modo !== 'boton';
  if (modo === 'ios') {
    $('#instalar-texto').innerHTML = `
      <strong>Tenla a mano</strong>
      Pulsa ${icono('i-compartir')} Compartir y luego «Añadir a pantalla de inicio».`;
  }
}

/** Mensaje para lectores de pantalla */
export function anunciar(texto) {
  $('#anuncio').textContent = texto;
}


/* ---------- 1. Precio de ahora ---------- */

let proximasAbiertas = false;
let ultimoAhora = null;

const DESCRIPCION_TRAMO = {
  1: 'el precio más caro de tu tarifa',
  2: 'el precio intermedio de tu tarifa',
  3: 'el precio más barato de tu tarifa',
};

/**
 * hora: la hora actual · nivel: 'barata' | 'media' | 'cara' · media: media del día
 * proximas: las próximas horas (para el desplegable) · nivelDe: hora → nivel
 * tarifa: la de la persona · plano: hoy cuesta lo mismo todo el día
 * valle: motivo si hoy es valle todo el día ('domingo', 'festivo (Navidad)'…) o null
 */
export function pintarAhora(datos) {
  ultimoAhora = datos;
  const { hora: actual, nivel, media, proximas, nivelDe, tarifa, plano, valle } = datos;
  const caja = $('#ahora');
  caja.className = `tarjeta ahora nivel--${nivel}`;
  document.body.classList.remove('sin-datos');

  let comparacion;
  if (tarifa.tipo === 'fija') {
    comparacion = 'Con tu <strong>precio fijo</strong> cuesta lo mismo a cualquier hora.';
  } else if (plano) {
    comparacion = valle
      ? `Hoy es ${valle}: <strong>todo el día es valle</strong> y con tu tarifa cuesta lo mismo a cualquier hora.`
      : 'Hoy cuesta lo mismo a cualquier hora.';
  } else if (tarifa.tipo === 'tramos') {
    comparacion = `Ahora es hora <strong>${NOMBRE_PERIODO[actual.periodo]}</strong>: ${DESCRIPCION_TRAMO[actual.periodo]}.`;
  } else if (actual.precio <= 0) {
    // Pasa de verdad: con mucho sol y viento, el PVPC baja de cero algunas horas
    comparacion = '<strong>Precio negativo:</strong> ahora la energía te sale gratis (incluso te descuentan un poco). Es el mejor momento para poner aparatos.';
  } else {
    const diferencia = Math.abs(media) < 0.005 ? 0 : (actual.precio - media) / Math.abs(media);
    if (Math.abs(diferencia) < 0.03) {
      comparacion = `Justo en la media de hoy (${precio(media)} €/kWh).`;
    } else {
      const sentido = diferencia < 0 ? 'más barata' : 'más cara';
      comparacion = `<strong>Un ${porcentaje(Math.abs(diferencia))} ${sentido}</strong> que la media de hoy (${precio(media)} €/kWh).`;
    }
  }

  // Con PVPC o indexada, un día valle se avisa aparte: el precio sigue cambiando
  const avisoValle = valle && !plano && tarifa.tipo !== 'fija'
    ? `<p class="pastilla pastilla--valle">${icono('i-calendario')}Hoy es ${valle}: todo el día es valle, sin el recargo de punta</p>`
    : '';

  // Desplegable con las próximas horas (mini gráfico)
  let proximasHTML = '';
  if (proximasAbiertas && proximas.length) {
    const maximo = Math.max(...proximas.map((h) => h.precio));
    proximasHTML = `
      <div class="proximas" id="proximas">
        ${proximas.map((h, i) => `
          <div class="proxima nivel--${nivelDe(h)}">
            <span class="proxima__barra"><span style="--alto:${Math.max(8, maximo > 0 ? (Math.max(0, h.precio) / maximo) * 100 : 8).toFixed(1)}%;--i:${i}"></span></span>
            <span class="proxima__hora">${hora(h.inicio).slice(0, 2)} h</span>
            <span class="proxima__precio">${precio(h.precio)}</span>
          </div>`).join('')}
      </div>`;
  }

  ponerHTML(caja, `
    <div class="ahora__arriba">
      <p class="ahora__titulo">Ahora · <strong>${hora(actual.inicio)} – ${hora(actual.fin)}</strong></p>
      <span class="etiqueta nivel--${nivel}">${tarifa.tipo === 'tramos' ? mayuscula(NOMBRE_PERIODO[actual.periodo]) : NOMBRE_NIVEL[nivel]}</span>
    </div>
    <p class="ahora__precio">${precio(actual.precio)}<span class="ahora__unidad">€/kWh</span></p>
    <p class="ahora__impuestos">${tarifa.impuestos ? 'Con impuestos' : 'Sin impuestos'} · ${NOMBRE_TIPO[tarifa.tipo]}</p>
    <p class="ahora__comparacion">${comparacion}</p>
    ${avisoValle}
    <button type="button" class="ahora__mas" aria-expanded="${proximasAbiertas}" aria-controls="proximas">
      ${proximasAbiertas ? 'Ver menos' : 'Ver las próximas horas'} ${icono('i-abajo')}
    </button>
    ${proximasHTML}`);
}


/* ---------- 2. Las horas más baratas que quedan ---------- */

/** iguales: todas las horas que quedan cuestan lo mismo (precio fijo, o tres tramos en día valle) */
export function pintarBaratas({ horas, ahora, nivelDe, hayManana, iguales = false }) {
  $('#aviso-manana').hidden = !hayManana;

  if (iguales && horas.length) {
    $('#titulo-baratas').textContent = 'Hoy da igual la hora';
    ponerHTML($('#baratas'), `
      <li class="barata-igual">
        <span class="barata-igual__icono">${icono('i-check')}</span>
        <span class="barata-igual__texto">
          <strong>Todas las horas que quedan hoy cuestan lo mismo: ${precio(horas[0].precio)} €/kWh.</strong>
          Con tu tarifa no hace falta esperar: pon los aparatos cuando te venga mejor.
        </span>
      </li>`);
    return;
  }

  const titulos = ['La última hora de hoy', 'Las 2 horas que quedan hoy', 'Las 3 horas más baratas que quedan hoy'];
  $('#titulo-baratas').textContent = titulos[Math.min(horas.length, 3) - 1];

  ponerHTML($('#baratas'), horas.map((h, puesto) => {
    const esAhora = h.inicio <= ahora && ahora < h.fin;
    return `
      <li>
        <button type="button" class="barata tocable" data-inicio="${h.inicio.getTime()}"
          aria-label="${puesto + 1}.ª más barata: de ${hora(h.inicio)} a ${hora(h.fin)}, ${precio(h.precio)} euros el kilovatio hora. Ver en el gráfico">
          <span class="barata__puesto" aria-hidden="true">${puesto + 1}</span>
          <span class="barata__hora">${hora(h.inicio)}</span>
          <span class="barata__hasta">hasta ${hora(h.fin)}</span>
          ${esAhora ? '<span class="barata__ahora">Ahora</span>' : ''}
          <span class="barata__precio"><span class="punto nivel--${nivelDe(h)}"></span>${precio(h.precio)}</span>
          <span class="barata__unidad">€/kWh</span>
        </button>
      </li>`;
  }).join(''));
}


/* ---------- 3. Electrodomésticos, «Más» y resultado ---------- */

/**
 * principales / mas: listas de aparatos ({ id, nombre, icono, minutos }) en su orden.
 * Cada aparato va en un «hueco» con su botón y la insignia − / ＋ del modo Personalizar.
 */
export function pintarElectros({ principales, mas, elegido }) {
  const hueco = (electro, enMas) => `
    <div class="electro-hueco" data-id="${electro.id}">
      <button type="button" class="electro" data-id="${electro.id}" aria-pressed="${electro.id === elegido}">
        ${icono(electro.icono, 'icono electro__icono')}
        <span class="electro__nombre">${electro.nombre}</span>
        <span class="electro__duracion">${textoDuracion(electro.minutos)}</span>
      </button>
      <button type="button" class="electro__insignia ${enMas ? 'electro__insignia--mas' : ''}" data-no-arrastrar
        data-mover-a="${enMas ? 'principal' : 'mas'}" data-id="${electro.id}"
        aria-label="${enMas ? 'Pasar a la pantalla principal' : 'Pasar a «Más»'}: ${electro.nombre}">
        ${icono(enMas ? 'i-mas' : 'i-menos')}
      </button>
    </div>`;
  $('#electros').innerHTML = principales.map((e) => hueco(e, false)).join('');
  $('#electros-mas').innerHTML = mas.map((e) => hueco(e, true)).join('');
}

export function marcarElectro(id) {
  for (const boton of document.querySelectorAll('.electro')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.id === id));
  }
}

export const masAbierto = () => $('#zona-mas').classList.contains('zona-mas--abierta');

/** Abre o cierra la zona «Más» */
export function abrirMas(abrir) {
  const zona = $('#zona-mas');
  zona.classList.toggle('zona-mas--abierta', abrir);
  zona.inert = !abrir;
  $('#boton-mas').setAttribute('aria-expanded', String(abrir));
  $('#boton-mas-texto').textContent = abrir ? 'Ver menos' : 'Ver más';
}

export function verResultado() {
  const tarjeta = $('#tarjeta-resultado');
  const caja = tarjeta.getBoundingClientRect();
  if (caja.bottom > innerHeight || caja.top < 0) {
    tarjeta.scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth', block: 'nearest' });
  }
}

/** Consejo para quien tiene placas solares */
const notaPlacas = () => `
  <p class="pastilla pastilla--sol">${icono('i-panel-solar')}Con tus placas: si hace sol, lo más barato es ponerlo en las horas de más sol (más o menos de 12:00 a 16:00)</p>`;

/**
 * franja: lo que devuelve buscarMejorFranja() (o null si no cabe)
 * coste: { mejor, empezandoYa } con { euros, kWh } de cada una
 * limites: para desactivar los botones − y + cuando se llega al tope
 * animar: true si el cambio lo ha hecho la persona (aparece con un pequeño efecto)
 * plano: con su tarifa cuesta lo mismo a cualquier hora · placas: tiene placas solares
 * Devuelve un texto corto por si hay que anunciarlo a los lectores de pantalla.
 */
export function pintarResultado({ electro, minutos, kw, franja, coste, ahora, fechaHoy, limites, animar, plano = false, placas = false }) {
  $('#duracion').textContent = textoDuracion(minutos);
  $('#potencia').textContent = textoPotencia(kw);
  $('#duracion-menos').disabled = minutos <= limites.duracion[0];
  $('#duracion-mas').disabled = minutos >= limites.duracion[1];
  $('#potencia-menos').disabled = kw <= limites.potencia[0];
  $('#potencia-mas').disabled = kw >= limites.potencia[1];

  const caja = $('#resultado');
  let html;
  let resumen;

  if (!franja) {
    const seguidas = minutos < 60 ? 'seguidos' : 'seguidas';
    html = `
      <p class="resultado__etiqueta">Mejor momento · ${electro.nombre}</p>
      <p class="resultado__titulo">No quedan ${textoDuracion(minutos)} ${seguidas} con precio</p>
      <p class="resultado__detalle">Red Eléctrica publica los precios de mañana hacia las 20:30.</p>`;
    resumen = 'No quedan horas suficientes con precio publicado';
  } else if (plano) {
    // Precio fijo (o tres tramos en un día valle): da igual cuándo
    html = `
      <p class="resultado__etiqueta">Mejor momento · ${electro.nombre}</p>
      <p class="resultado__titulo">Cuando quieras</p>
      <p class="resultado__detalle">Con tu tarifa cuesta lo mismo a cualquier hora · ${precio(franja.mejor.precioMedio)} €/kWh</p>
      <div class="coste coste--uno">
        <div class="coste__dato coste__dato--mejor">
          <span class="coste__valor">${euros(coste.mejor.euros)}</span>
          <span class="coste__texto">te costará aproximadamente</span>
        </div>
      </div>
      <p class="pastilla pastilla--buena">${icono('i-check')}No hace falta esperar</p>
      ${placas ? notaPlacas() : ''}
      <p class="coste__nota">Unos ${textoKWh(coste.mejor.kWh)} (${textoPotencia(kw)} durante ${textoDuracion(minutos)}) · con impuestos</p>`;
    resumen = `${electro.nombre}. Cuesta lo mismo a cualquier hora: ${euros(coste.mejor.euros)}.`;
  } else {
    const { mejor, empezandoYa } = franja;
    const yaMismo = mejor.inicio <= ahora;
    const dia = fechaEnEspana(mejor.inicio) === fechaHoy ? 'Hoy' : 'Mañana';
    const titulo = yaMismo ? 'Ahora mismo' : `${dia}, de ${hora(mejor.inicio)} a ${hora(mejor.fin)}`;
    const detalle = yaMismo
      ? `Hasta ${laHora(new Date(ahora.getTime() + minutos * 60000))} · ${precio(mejor.precioMedio)} €/kWh de media`
      : `Empieza dentro de ${textoTiempo(mejor.inicio - ahora)} · ${precio(mejor.precioMedio)} €/kWh de media`;

    // Coste: si lo mejor es empezar ya, una sola cifra; si no, las dos para comparar
    const costeHTML = yaMismo
      ? `<div class="coste coste--uno">
          <div class="coste__dato coste__dato--mejor">
            <span class="coste__valor">${euros(coste.mejor.euros)}</span>
            <span class="coste__texto">te costará aproximadamente</span>
          </div>
        </div>`
      : `<div class="coste">
          <div class="coste__dato coste__dato--mejor">
            <span class="coste__valor">${euros(coste.mejor.euros)}</span>
            <span class="coste__texto">en la mejor franja</span>
          </div>
          <div class="coste__dato">
            <span class="coste__valor">${euros(coste.empezandoYa.euros)}</span>
            <span class="coste__texto">si empiezas ya</span>
          </div>
        </div>`;

    // ¿Compensa esperar? Si se ahorra menos de un 3 %, lo decimos
    const ahorro = (empezandoYa.precioMedio - mejor.precioMedio) / empezandoYa.precioMedio;
    let pastilla;
    if (yaMismo) {
      pastilla = `<p class="pastilla pastilla--buena">${icono('i-rayo')}Es el momento más barato</p>`;
    } else if (ahorro >= 0.03) {
      const ahorroEuros = coste.empezandoYa.euros - coste.mejor.euros;
      pastilla = `<p class="pastilla pastilla--buena">${icono('i-baja')}Ahorras ${euros(ahorroEuros)} (un ${porcentaje(ahorro)} menos)</p>`;
    } else {
      pastilla = '<p class="pastilla">Empezar ya cuesta casi lo mismo</p>';
    }

    html = `
      <p class="resultado__etiqueta">Mejor momento · ${electro.nombre}</p>
      <p class="resultado__titulo">${titulo}</p>
      <p class="resultado__detalle">${detalle}</p>
      ${costeHTML}
      ${pastilla}
      ${placas ? notaPlacas() : ''}
      <p class="coste__nota">Unos ${textoKWh(coste.mejor.kWh)} (${textoPotencia(kw)} durante ${textoDuracion(minutos)}) · con impuestos</p>`;
    resumen = `${electro.nombre}. Mejor momento: ${titulo}. Coste aproximado: ${euros(coste.mejor.euros)}.`;
  }

  if (ponerHTML(caja, html) && animar && !prefiereMenosMovimiento()) {
    caja.classList.remove('resultado__cuerpo--nuevo');
    void caja.offsetWidth; // reinicia la animación
    caja.classList.add('resultado__cuerpo--nuevo');
  }
  return resumen;
}


/* ---------- 4. Gráfico y calendario ---------- */

let datosGrafico = null;  // lo último que se pintó (para la lectura y al girar el móvil)
let barraElegida = null;  // índice de la barra que ha tocado la persona (o null)

/** dia: 'hoy' | 'manana' | 'calendario' · texto: lo que pone en la pestaña del calendario */
export function pintarPestanas(dia, textoCalendario = '') {
  for (const pestana of document.querySelectorAll('.pestana[data-dia]')) {
    pestana.setAttribute('aria-pressed', String(pestana.dataset.dia === dia));
  }
  $('#texto-calendario').textContent = textoCalendario;
  $('#calendario-luz').hidden = dia !== 'calendario';
}

/** «Barata», «Media», «Cara»… o, con tres tramos, «Valle», «Llano», «Punta» */
const nombreNivel = (h, nivel) => (datosGrafico?.porTramos ? mayuscula(NOMBRE_PERIODO[h.periodo]) : NOMBRE_NIVEL[nivel]);

/** «Mañana» todavía sin publicar */
export function pintarSinManana(texto) {
  datosGrafico = null;
  $('#con-datos').hidden = true;
  $('#sin-manana').hidden = false;
  $('#sin-manana-texto').textContent = texto;
}

/**
 * Dibuja las barras de un día.
 *   horas, resumen ({ media, minima, maxima }), nivelDe (precio → nivel)
 *   ahora, esHoy (para marcar «ahora» y atenuar lo pasado)
 *   franja (mejor franja del electrodoméstico, o null) y electro (para su nombre)
 *   titulo: texto encima del gráfico (para los días del calendario) o null
 *   aviso: frase destacada encima del gráfico (día valle, precio igual…) o null
 *   nota: texto pequeño debajo de la leyenda (tarifa, impuestos, hora)
 *   animar: true para que las barras crezcan
 */
export function pintarGrafico(datos) {
  const { horas, resumen, nivelDe, ahora, esHoy, franja, electro, titulo, aviso = null, nota = '', porTramos = false, animar } = datos;
  $('#aviso-grafico').hidden = !aviso;
  $('#aviso-grafico').textContent = aviso ?? '';
  $('#nota-grafico').textContent = nota;
  // Con tres tramos, los colores son los tramos de la tarifa
  const nombres = porTramos ? ['Valle', 'Llano', 'Punta'] : ['Barata', 'Media', 'Cara'];
  document.querySelectorAll('.leyenda li').forEach((li, i) => { li.textContent = nombres[i]; });

  // Si cambiamos de día, olvidamos la barra elegida
  if (!datosGrafico || datosGrafico.horas[0].inicio.getTime() !== horas[0].inicio.getTime()) {
    barraElegida = null;
  }
  datosGrafico = datos;
  $('#con-datos').hidden = false;
  $('#sin-manana').hidden = true;
  $('#dia-grafico').hidden = !titulo;
  $('#dia-grafico').textContent = titulo ?? '';

  const caja = $('#grafico');
  const total = horas.length; // 24 (o 23/25 los días de cambio de hora)
  const inicioDia = horas[0].inicio.getTime();
  const duracionDia = horas[total - 1].fin.getTime() - inicioDia;
  const posicion = (instante) => ((instante - inicioDia) / duracionDia) * 100; // instante → % del ancho

  // Escala del eje vertical con números redondos (0,10 · 0,20 · 0,30 …)
  const { paso, lineas } = escalaBonita(resumen.maxima.precio);
  const tope = paso * lineas;

  let lineasHTML = '';
  for (let k = 1; k <= lineas; k++) {
    lineasHTML += `<div class="grafico__linea" style="bottom:${(k / lineas) * 100}%"><span>${formatoEje.format(k * paso)}</span></div>`;
  }

  const barrasHTML = horas.map((h, i) => {
    const nivel = nivelDe(h);
    const pasada = esHoy && h.fin <= ahora;
    const alto = Math.max(1.5, (Math.max(0, h.precio) / tope) * 100);
    return `
      <button type="button" class="barra nivel--${nivel}${pasada ? ' barra--pasada' : ''}"
        data-i="${i}" style="--alto:${alto.toFixed(2)}%;--i:${i}"
        aria-label="De ${hora(h.inicio)} a ${hora(h.fin)}: ${precio(h.precio)} euros el kilovatio hora. ${nombreNivel(h, nivel)}.">
        <span class="barra__relleno"></span>
      </button>`;
  }).join('');

  // Banda lavanda con la mejor franja del electrodoméstico (si cae en este día)
  let franjaHTML = '';
  let etiquetaHTML = '';
  if (franja) {
    const desde = Math.max(0, posicion(franja.inicio.getTime()));
    const hasta = Math.min(100, posicion(franja.fin.getTime()));
    if (hasta > desde) {
      franjaHTML = `<div class="grafico__franja" style="left:${desde}%;width:${hasta - desde}%"></div>`;
      const centro = (desde + hasta) / 2;
      const lado = centro < 18 ? 'izquierda' : centro > 82 ? 'derecha' : 'centro';
      const x = lado === 'izquierda' ? desde : lado === 'derecha' ? hasta : centro;
      etiquetaHTML = `
        <span class="grafico__etiqueta-franja grafico__etiqueta-franja--${lado}" style="left:${x}%">
          ${icono(electro.icono)}${electro.nombre}
        </span>`;
    }
  }

  // Línea de «ahora» y su pastilla en el eje
  let ahoraHTML = '';
  let pastillaHTML = '';
  let posicionAhora = null;
  if (esHoy) {
    posicionAhora = posicion(ahora.getTime());
    ahoraHTML = `<div class="grafico__ahora" style="left:${posicionAhora}%"></div>`;
    pastillaHTML = `<span class="grafico__pastilla-ahora" style="left:${posicionAhora}%">ahora</span>`;
  }

  // Horas del eje, cada 3 horas. Quitamos las que chocarían con «ahora».
  const ancho = caja.clientWidth || 300;
  const distanciaMinima = (34 / ancho) * 100;
  const ejeHTML = horas.map((h, i) => {
    const numero = Number(hora(h.inicio).slice(0, 2));
    if (numero % 3 !== 0) return '';
    if (i > 0 && hora(horas[i - 1].inicio) === hora(h.inicio)) return ''; // hora repetida (cambio de hora)
    const centro = ((i + 0.5) / total) * 100;
    if (posicionAhora !== null && Math.abs(centro - posicionAhora) < distanciaMinima) return '';
    return `<span style="left:${centro}%">${hora(h.inicio).slice(0, 2)}</span>`;
  }).join('');

  ponerHTML(caja, `
    <div class="grafico__marcas">${etiquetaHTML}</div>
    <div class="grafico__area${animar ? ' grafico__area--entrando' : ''}">
      ${lineasHTML}
      ${franjaHTML}
      ${ahoraHTML}
      <div class="grafico__barras" role="group" aria-label="Precio de cada hora">${barrasHTML}</div>
    </div>
    <div class="grafico__eje" aria-hidden="true">${ejeHTML}${pastillaHTML}</div>`);

  // Mínimo y máximo se pueden tocar para verlos en el gráfico
  ponerHTML($('#resumen'), `
    <button type="button" class="resumen__dato" data-inicio="${resumen.minima.inicio.getTime()}" aria-label="Ver la hora más barata en el gráfico">
      <span class="resumen__nombre">Mínimo</span>
      <span class="resumen__valor">${precio(resumen.minima.precio)}</span>
      <span class="resumen__nota">a ${laHora(resumen.minima.inicio)}</span>
    </button>
    <div class="resumen__dato">
      <span class="resumen__nombre">Media</span>
      <span class="resumen__valor">${precio(resumen.media)}</span>
      <span class="resumen__nota">€/kWh</span>
    </div>
    <button type="button" class="resumen__dato" data-inicio="${resumen.maxima.inicio.getTime()}" aria-label="Ver la hora más cara en el gráfico">
      <span class="resumen__nombre">Máximo</span>
      <span class="resumen__valor">${precio(resumen.maxima.precio)}</span>
      <span class="resumen__nota">a ${laHora(resumen.maxima.inicio)}</span>
    </button>`);

  // La misma información en una tabla (cifras exactas y lectores de pantalla)
  ponerHTML($('#tabla'), horas.map((h) => {
    const nivel = nivelDe(h);
    const clase = esHoy && h.fin <= ahora ? 'pasada' : esHoy && h.inicio <= ahora ? 'actual' : '';
    return `
      <tr class="${clase}">
        <td>${hora(h.inicio)} – ${hora(h.fin)}</td>
        <td>${precio(h.precio)}</td>
        <td><span class="punto nivel--${nivel}"></span>${nombreNivel(h, nivel)}</td>
      </tr>`;
  }).join(''));

  actualizarLectura();
}

/** Marca en el gráfico la hora que empieza en `instante` (milisegundos) */
export function elegirHora(instante) {
  if (!datosGrafico) return;
  const indice = datosGrafico.horas.findIndex((h) => h.inicio.getTime() === instante);
  if (indice < 0) return;
  barraElegida = indice;
  actualizarLectura();
  navigator.vibrate?.(8);
}

/** Texto para el título del gráfico en los días del calendario: «Sábado, 15 de octubre» */
export const tituloDia = (fecha) => mayuscula(formatoFecha.format(new Date(`${fecha}T12:00:00Z`)));

/** Elige un paso «redondo» para que el eje tenga como mucho 4 líneas. */
function escalaBonita(maximo) {
  for (const paso of [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]) {
    const lineas = Math.ceil(maximo / paso - 1e-9);
    if (lineas <= 4) return { paso, lineas: Math.max(1, lineas) };
  }
  return { paso: 1, lineas: Math.ceil(maximo) };
}

/** Escribe arriba del gráfico el precio de la barra elegida (o de la hora actual). */
function actualizarLectura() {
  if (!datosGrafico) return;
  const { horas, ahora, esHoy, nivelDe } = datosGrafico;

  let indice = barraElegida;
  let extra = '';
  if (indice === null && esHoy) {
    indice = horas.findIndex((h) => h.inicio <= ahora && ahora < h.fin);
    extra = ' · ahora';
  }

  for (const barra of document.querySelectorAll('#grafico .barra')) {
    barra.classList.toggle('barra--elegida', Number(barra.dataset.i) === barraElegida);
  }

  const lectura = $('#lectura');
  if (indice === null || indice < 0) {
    lectura.innerHTML = '<span class="lectura__pista">Toca una barra o desliza el dedo para ver cada hora.</span>';
    return;
  }

  const h = horas[indice];
  const nivel = nivelDe(h);
  lectura.innerHTML = `
    <span class="lectura__valor">${precio(h.precio)} <span class="lectura__unidad">€/kWh</span></span>
    <span class="lectura__detalle"><span class="punto nivel--${nivel}"></span>${hora(h.inicio)} – ${hora(h.fin)} · ${nombreNivel(h, nivel)}${extra}</span>`;
}

/**
 * Tocar o deslizar el dedo por el gráfico va enseñando el precio de cada hora.
 * Con ratón, basta con pasar por encima. Con teclado, cada barra es un botón.
 */
function iniciarGestosDelGrafico() {
  const caja = $('#grafico');
  let arrastrando = false;

  const elegirEn = (x) => {
    const barras = caja.querySelector('.grafico__barras');
    if (!barras || !datosGrafico) return;
    const zona = barras.getBoundingClientRect();
    const indice = Math.floor(((x - zona.left) / zona.width) * datosGrafico.horas.length);
    if (indice >= 0 && indice < datosGrafico.horas.length && indice !== barraElegida) {
      barraElegida = indice;
      actualizarLectura();
    }
  };

  caja.addEventListener('pointerdown', (evento) => {
    if (!evento.target.closest('.grafico__area') || editando()) return;
    arrastrando = evento.pointerType !== 'mouse';
    elegirEn(evento.clientX);
  });

  caja.addEventListener('pointermove', (evento) => {
    const conRaton = evento.pointerType === 'mouse' && evento.target.closest('.grafico__area');
    if (arrastrando || conRaton) elegirEn(evento.clientX);
  });

  const soltar = () => { arrastrando = false; };
  caja.addEventListener('pointerup', soltar);
  caja.addEventListener('pointercancel', soltar);

  // Con ratón, al salir del gráfico vuelve a enseñar la hora actual
  caja.addEventListener('pointerleave', (evento) => {
    soltar();
    if (evento.pointerType === 'mouse' && barraElegida !== null && datosGrafico?.esHoy) {
      barraElegida = null;
      actualizarLectura();
    }
  });

  // Con el teclado (Tab), la barra enfocada se muestra igual que al tocarla
  caja.addEventListener('focusin', (evento) => {
    const barra = evento.target.closest('.barra');
    if (barra && barra.matches(':focus-visible')) {
      barraElegida = Number(barra.dataset.i);
      actualizarLectura();
    }
  });
}


/* ---------- 5. Tu tarifa, cosas a tener en cuenta y pie ---------- */

/** 0.0511269632 → "5,11 %" · 0.425 → "42,5 %" */
const tanto = (valor) => `${(valor * 100).toLocaleString('es-ES', { maximumFractionDigits: 2 })} %`;
const ZONA_TEXTO = { peninsula: 'la península', baleares: 'Baleares', canarias: 'Canarias', ceuta: 'Ceuta', melilla: 'Melilla' };

/** Texto corto de la tarifa: «Tres tramos · punta 0,200 · llano 0,130 · valle 0,090 €/kWh» */
export function textoTarifa(tarifa) {
  if (tarifa.tipo === 'fija') return `Precio fijo · ${precio(tarifa.precioFijo)} €/kWh a cualquier hora`;
  if (tarifa.tipo === 'tramos') {
    const { punta, llano, valle } = tarifa.tramos;
    return `Tres tramos · punta ${precio(punta)} · llano ${precio(llano)} · valle ${precio(valle)} €/kWh`;
  }
  if (tarifa.tipo === 'indexada') return `Indexada · precio del mercado + ${cifra(tarifa.margen, 3)} €/kWh`;
  return 'PVPC (precio regulado) · cambia cada hora';
}

/**
 * La tarjeta «Tu tarifa».
 *   mediaHoy: precio medio de hoy con su tarifa (o null) · cuentas: lo que devuelve factura()
 *   valle: motivo si hoy es valle todo el día, o null · hoy: 'AAAA-MM-DD'
 */
export function pintarTarifa({ tarifa, mediaHoy, cuentas, valle, hoy, baseFactura = '' }) {
  $('#tarifa-tipo').textContent = textoTarifa(tarifa);

  const potencias = tarifa.potenciaValle !== null && tarifa.potenciaValle !== tarifa.potencia
    ? `${textoPotencia(tarifa.potencia)} y ${textoPotencia(tarifa.potenciaValle)} en valle`
    : textoPotencia(tarifa.potencia);
  const etiquetas = [ZONAS[tarifa.zona].nombre, tarifa.impuestos ? 'Con impuestos' : 'Sin impuestos', potencias];
  if (tarifa.bono !== 'no') etiquetas.push(`Bono social −${tanto(OFICIAL.bono[tarifa.bono])}`);
  if (tarifa.rebaja) etiquetas.push('Rebaja de impuestos');
  if (tarifa.placas) etiquetas.push('Placas solares');
  ponerHTML($('#tarifa-etiquetas'), etiquetas.map((texto) => `<li>${texto}</li>`).join(''));

  const dato = (nombre, valor, nota) => `
    <div class="tarifa__dato">
      <span class="tarifa__dato-nombre">${nombre}</span>
      <span class="tarifa__dato-valor">${valor}</span>
      <span class="tarifa__dato-nota">${nota}</span>
    </div>`;
  const datos = [];
  if (mediaHoy !== null) datos.push(dato('Hoy, de media', `${precio(mediaHoy)} <small>€/kWh</small>`, tarifa.impuestos ? 'con impuestos' : 'sin impuestos'));
  datos.push(dato('Lo fijo al mes', euros(cuentas.fijo), 'potencia, contador y bono social, con impuestos'));
  if (cuentas.total !== null) {
    datos.push(dato('Tu factura', `≈ ${euros(cuentas.total)}`, `al mes con ${cifra(tarifa.consumo, 0)} kWh, ${baseFactura}`));
  } else {
    datos.push(`
      <button type="button" class="tarifa__dato tarifa__dato--boton" data-abrir-tarifa="consumo">
        <span class="tarifa__dato-nombre">Tu factura</span>
        <span class="tarifa__dato-valor">Calcular ${icono('i-flecha')}</span>
        <span class="tarifa__dato-nota">pon lo que gastas al mes</span>
      </button>`);
  }
  ponerHTML($('#tarifa-datos'), datos.join(''));

  let aviso = '';
  if (valle && tarifa.tipo === 'tramos') aviso = `Hoy es ${valle}: todo el día es valle y con tus tres tramos pagas lo mismo a cualquier hora.`;
  else if (valle && tarifa.tipo !== 'fija') aviso = `Hoy es ${valle}: todo el día es valle. El precio sigue cambiando cada hora, pero sin el recargo de punta.`;
  if (tarifa.bono !== 'no' && hoy > OFICIAL.bono.hasta) {
    aviso += `${aviso ? ' ' : ''}Ojo: los descuentos del bono social de 2026 terminaban el 31 de diciembre. Mira si han cambiado.`;
  }
  $('#tarifa-aviso').hidden = !aviso;
  $('#tarifa-aviso').textContent = aviso;

  $('#interruptor-impuestos').setAttribute('aria-checked', String(tarifa.impuestos));
}

/**
 * Las partes de «Cosas a tener en cuenta» que dependen de la persona y del día.
 *   proximo: { fecha, motivo } del próximo día valle completo
 */
export function pintarClaves({ tarifa, hoy, valle, proximo, cuentas }) {
  $('#estado-tipo').textContent = `En la app tienes: ${textoTarifa(tarifa)}.`;

  $('#resumen-valle').textContent = valle ? `Hoy es ${valle}: todo el día valle` : 'Todo el día es valle';
  $('#estado-valle').textContent = valle
    ? `Hoy, ${diaCorto(hoy)}, es valle todo el día.`
    : proximo ? `El próximo día valle completo es el ${diaCorto(proximo.fecha)}${proximo.motivo.startsWith('festivo') ? `, ${proximo.motivo}` : ''}.` : '';

  const sinImpuestos = cuentas.potencia;
  const deQuien = cuentas.precios.deLaCompania ? 'con el precio de tu compañía'
    : tarifa.tipo === 'pvpc' ? 'con el precio del PVPC' : 'con el precio del PVPC (pon el de tu compañía en «Tu tarifa»)';
  $('#estado-potencia').textContent = `Con ${textoPotencia(tarifa.potencia)} pagas unos ${euros(sinImpuestos)} al mes de potencia, sin impuestos, ${deQuien}.`;

  const indirecto = cuentas.indirecto;
  $('#estado-impuestos').textContent = `En ${ZONA_TEXTO[tarifa.zona]}${tarifa.rebaja ? ', con rebaja' : ''}: impuesto eléctrico ${tanto(tarifa.rebaja ? OFICIAL.rebaja.iee : OFICIAL.iee)} e ${indirecto.nombre} ${tanto(indirecto.luz)}. Ahora ves los precios ${tarifa.impuestos ? 'con' : 'sin'} impuestos.`;
  const botonImpuestos = document.querySelector('[data-clave="impuestos"] [data-abrir-tarifa]');
  botonImpuestos.textContent = tarifa.impuestos ? 'Ver precios sin impuestos' : 'Ver precios con impuestos';
}

/** El pie de la página explica qué precios se están viendo */
export function pintarPie(tarifa, indirecto) {
  const enHora = tarifa.zona === 'canarias' ? 'en hora canaria' : 'en hora peninsular';
  const impuestos = tarifa.impuestos ? `con impuestos (impuesto eléctrico e ${indirecto.nombre})` : 'sin impuestos';
  const textos = {
    pvpc: `Precio PVPC (tarifa 2.0TD) en ${ZONA_TEXTO[tarifa.zona]}, en €/kWh y ${enHora}. Incluye peajes y cargos${tarifa.bono !== 'no' ? ' y el descuento del bono social' : ''}; se ve ${impuestos} y sin la potencia.`,
    fija: `Precio de tu contrato, ${impuestos}. Las horas, ${enHora}.`,
    tramos: `Precios de tu contrato (punta, llano y valle), ${impuestos}. Los tramos son los de ${ZONA_TEXTO[tarifa.zona]}, ${enHora}.`,
    indexada: `Tarifa indexada: precio del mercado de cada hora (Red Eléctrica) + peajes y cargos de 2026 de su tramo + lo que suma tu compañía; ${impuestos}. Las horas, ${enHora}.`,
  };
  $('#pie-tarifa').textContent = textos[tarifa.tipo];
  $('#pie-coste').textContent = `El coste de cada aparato es aproximado: usa su potencia media y suma los impuestos (impuesto eléctrico e ${indirecto.nombre}).`;
  $('#pie-colores').textContent = tarifa.tipo === 'tramos'
    ? 'Colores: verde las horas valle, amarillo las llano y rojo las punta.'
    : 'Verde: al menos un 10 % más barata que la media del día. Rojo: al menos un 10 % más cara. Amarillo: entre medias.';
}
