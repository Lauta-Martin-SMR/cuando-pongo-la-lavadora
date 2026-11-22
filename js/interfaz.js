/*
 * interfaz.js
 * ------------------------------------------------------------------
 * Todo lo que se ve en pantalla. app.js le pasa los datos ya calculados
 * y aquí se convierten en HTML. Este archivo no descarga nada.
 *
 * Usamos plantillas de texto (`…${valor}…`) con innerHTML porque se leen
 * fácil. Es seguro porque solo metemos textos nuestros y números que ya
 * hemos formateado, nunca texto que venga de fuera tal cual.
 */

import { ZONA_HORARIA, fechaEnEspana } from './calculos.js';


/* ---------- Formatos en español ---------- */

const formatoPrecio = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const formatoEje = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoHora = new Intl.DateTimeFormat('es-ES', {
  timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const formatoFecha = new Intl.DateTimeFormat('es-ES', {
  timeZone: ZONA_HORARIA, weekday: 'long', day: 'numeric', month: 'long',
});

const NOMBRE_NIVEL = { barata: 'Barata', media: 'Media', cara: 'Cara' };

/** 0.14345 → "0,143" */
const precio = (valor) => formatoPrecio.format(valor);
/** Date → "14:00" (hora peninsular) */
const hora = (fecha) => formatoHora.format(fecha);
/** Date → "las 14:00" o "la 01:00" */
const laHora = (fecha) => (hora(fecha).startsWith('01:') ? 'la ' : 'las ') + hora(fecha);
/** 0.44 → "44 %" (con un espacio que no se separa del número) */
const porcentaje = (valor) => `${Math.round(valor * 100)} %`;

const $ = (selector) => document.querySelector(selector);

/** 120 → "2 h", 90 → "1,5 h", 30 → "30 min" */
export function textoDuracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  return `${(minutos / 60).toLocaleString('es-ES', { maximumFractionDigits: 2 })} h`;
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
  if (ultimoHTML.get(elemento) === html) return;
  ultimoHTML.set(elemento, html);
  elemento.innerHTML = html;
}

const prefiereMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------- Arranque: botones y gestos ---------- */

/**
 * Conecta los botones con las funciones de app.js.
 * `acciones` trae: alElegirElectro, alCambiarDuracion, alCambiarDia, alReintentar, alInstalar.
 */
export function iniciar(acciones) {
  // Un solo «escuchador» para todos los electrodomésticos (delegación de eventos)
  $('#electros').addEventListener('click', (evento) => {
    const boton = evento.target.closest('.electro');
    if (boton) acciones.alElegirElectro(boton.dataset.id);
  });

  $('#menos').addEventListener('click', () => acciones.alCambiarDuracion(-30));
  $('#mas').addEventListener('click', () => acciones.alCambiarDuracion(+30));

  for (const pestana of document.querySelectorAll('.pestana')) {
    pestana.addEventListener('click', () => acciones.alCambiarDia(pestana.dataset.dia));
  }

  $('#ver-manana').addEventListener('click', () => {
    acciones.alCambiarDia('manana');
    $('#bloque-grafico').scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' });
  });

  // El botón «Reintentar» se crea más tarde, así que escuchamos en su caja
  $('#ahora').addEventListener('click', (evento) => {
    if (evento.target.closest('[data-accion="reintentar"]')) acciones.alReintentar();
  });

  $('#boton-instalar').addEventListener('click', () => acciones.alInstalar());

  iniciarGestosDelGrafico();

  // Si cambia el ancho (girar el móvil), repintamos el gráfico para recolocar las horas
  let espera;
  window.addEventListener('resize', () => {
    clearTimeout(espera);
    espera = setTimeout(() => datosGrafico && pintarGrafico({ ...datosGrafico, animar: false }), 150);
  });
}


/* ---------- Cabecera, errores y avisos ---------- */

export function pintarFecha(ahora) {
  const texto = formatoFecha.format(ahora); // "domingo, 22 de noviembre"
  $('#fecha').textContent = texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function pintarError(mensaje) {
  const caja = $('#ahora');
  caja.className = 'tarjeta ahora ahora--error';
  ponerHTML(caja, `
    <svg class="icono vacio__icono" aria-hidden="true"><use href="#i-enchufe"></use></svg>
    <p class="ahora__titulo-error">No hemos podido cargar los precios</p>
    <p class="vacio__texto">${mensaje}</p>
    <button type="button" class="boton" data-accion="reintentar">Reintentar</button>`);
  $('#contenido').hidden = true;
}

/** Texto pequeño del pie (sin conexión, etc.). Vacío = se oculta. */
export function pintarEstado(texto) {
  const caja = $('#estado');
  caja.textContent = texto;
  caja.hidden = !texto;
}

/** modo: 'boton' (Android, ordenador), 'ios' (instrucciones para iPhone) o null */
export function mostrarInstalar(modo) {
  $('#instalar').hidden = !modo;
  $('#boton-instalar').hidden = modo !== 'boton';
  if (modo === 'ios') {
    $('#instalar-texto').innerHTML = `
      <strong>Tenla a mano</strong>
      Pulsa <svg class="icono" aria-hidden="true"><use href="#i-compartir"></use></svg> Compartir
      y luego «Añadir a pantalla de inicio».`;
  }
}

/** Mensaje para lectores de pantalla */
export function anunciar(texto) {
  $('#anuncio').textContent = texto;
}


/* ---------- 1. Precio de ahora ---------- */

export function pintarAhora({ hora: actual, nivel, media }) {
  const caja = $('#ahora');
  caja.className = `tarjeta ahora nivel--${nivel}`;
  $('#contenido').hidden = false;

  const diferencia = (actual.precio - media) / media;
  let comparacion;
  if (Math.abs(diferencia) < 0.03) {
    comparacion = `Justo en la media de hoy (${precio(media)} €/kWh).`;
  } else {
    const sentido = diferencia < 0 ? 'más barata' : 'más cara';
    comparacion = `<strong>Un ${porcentaje(Math.abs(diferencia))} ${sentido}</strong> que la media de hoy (${precio(media)} €/kWh).`;
  }

  ponerHTML(caja, `
    <div class="ahora__arriba">
      <p class="ahora__titulo">Ahora · <strong>${hora(actual.inicio)} – ${hora(actual.fin)}</strong></p>
      <span class="etiqueta nivel--${nivel}">${NOMBRE_NIVEL[nivel]}</span>
    </div>
    <p class="ahora__precio">${precio(actual.precio)}<span class="ahora__unidad">€/kWh</span></p>
    <p class="ahora__comparacion">${comparacion}</p>`);
}


/* ---------- 2. Las horas más baratas que quedan ---------- */

export function pintarBaratas({ horas, ahora, nivelDe, hayManana }) {
  const titulos = ['La última hora de hoy', 'Las 2 horas que quedan hoy', 'Las 3 horas más baratas que quedan hoy'];
  $('#titulo-baratas').textContent = titulos[Math.min(horas.length, 3) - 1];

  ponerHTML($('#baratas'), horas.map((h, puesto) => {
    const esAhora = h.inicio <= ahora && ahora < h.fin;
    return `
      <li class="barata">
        <span class="barata__puesto" aria-hidden="true">${puesto + 1}</span>
        <span class="barata__hora">${hora(h.inicio)}</span>
        <span class="barata__hasta">hasta ${hora(h.fin)}</span>
        ${esAhora ? '<span class="barata__ahora">Ahora</span>' : ''}
        <span class="barata__precio"><span class="punto nivel--${nivelDe(h.precio)}"></span>${precio(h.precio)}</span>
        <span class="barata__unidad">€/kWh</span>
      </li>`;
  }).join(''));

  $('#aviso-manana').hidden = !hayManana;
}


/* ---------- 3. Electrodomésticos y mejor franja ---------- */

export function pintarElectros(lista) {
  $('#electros').innerHTML = lista.map((electro) => `
    <button type="button" class="electro" data-id="${electro.id}" aria-pressed="false">
      <svg class="icono electro__icono" aria-hidden="true"><use href="#${electro.icono}"></use></svg>
      <span class="electro__nombre">${electro.nombre}</span>
      <span class="electro__duracion">${textoDuracion(electro.minutos)}</span>
    </button>`).join('');
}

export function marcarElectro(id) {
  for (const boton of document.querySelectorAll('.electro')) {
    boton.setAttribute('aria-pressed', String(boton.dataset.id === id));
  }
}

/**
 * franja: lo que devuelve buscarMejorFranja() (o null si no cabe)
 * minimo / maximo: límites de duración, para desactivar los botones − y +
 */
export function pintarResultado({ electro, minutos, minimo, maximo, franja, ahora, fechaHoy }) {
  $('#duracion').textContent = textoDuracion(minutos);
  $('#menos').disabled = minutos <= minimo;
  $('#mas').disabled = minutos >= maximo;

  if (!franja) {
    const seguidas = minutos < 60 ? 'seguidos' : 'seguidas';
    ponerHTML($('#resultado'), `
      <p class="resultado__etiqueta">Mejor momento · ${electro.nombre}</p>
      <p class="resultado__titulo">No quedan ${textoDuracion(minutos)} ${seguidas} con precio</p>
      <p class="resultado__detalle">Red Eléctrica publica los precios de mañana hacia las 20:30.</p>`);
    return 'No quedan horas suficientes con precio publicado';
  }

  const { mejor, empezandoYa } = franja;
  const yaMismo = mejor.inicio <= ahora;
  const dia = fechaEnEspana(mejor.inicio) === fechaHoy ? 'Hoy' : 'Mañana';

  const titulo = yaMismo ? 'Ahora mismo' : `${dia}, de ${hora(mejor.inicio)} a ${hora(mejor.fin)}`;
  const detalle = yaMismo
    ? `Hasta ${laHora(new Date(ahora.getTime() + minutos * 60000))} · ${precio(mejor.precioMedio)} €/kWh de media`
    : `Empieza dentro de ${textoTiempo(mejor.inicio - ahora)} · ${precio(mejor.precioMedio)} €/kWh de media`;

  // Cuánto se ahorra frente a empezar ya. Si es menos de un 3 %, lo decimos:
  // quizá no compensa esperar.
  const ahorro = (empezandoYa.precioMedio - mejor.precioMedio) / empezandoYa.precioMedio;
  let pastilla;
  if (yaMismo) {
    pastilla = '<span class="pastilla pastilla--buena">Es el momento más barato</span>';
  } else if (ahorro >= 0.03) {
    pastilla = `<span class="pastilla pastilla--buena">Un ${porcentaje(ahorro)} más barato que empezar ya</span>`;
  } else {
    pastilla = '<span class="pastilla">Empezar ya cuesta casi lo mismo</span>';
  }

  ponerHTML($('#resultado'), `
    <p class="resultado__etiqueta">Mejor momento · ${electro.nombre}</p>
    <p class="resultado__titulo">${titulo}</p>
    <p class="resultado__detalle">${detalle}</p>
    ${pastilla}`);

  return `${electro.nombre}. Mejor momento: ${titulo}.`; // por si hay que anunciarlo
}


/* ---------- 4. Gráfico ---------- */

let datosGrafico = null;  // lo último que se pintó (para la lectura y al girar el móvil)
let barraElegida = null;  // índice de la barra que ha tocado la persona (o null)

export function pintarPestanas(dia) {
  for (const pestana of document.querySelectorAll('.pestana')) {
    pestana.setAttribute('aria-pressed', String(pestana.dataset.dia === dia));
  }
}

/** «Mañana» todavía sin publicar */
export function pintarSinManana(texto) {
  datosGrafico = null;
  $('#con-datos').hidden = true;
  $('#sin-manana').hidden = false;
  $('#sin-manana-texto').textContent = texto;
}

/**
 * Dibuja las barras de un día.
 *   horas:    las horas del día
 *   resumen:  { media, minima, maxima } de ese día
 *   nivelDe:  función precio → 'barata' | 'media' | 'cara'
 *   ahora:    Date actual
 *   esHoy:    true si es el día de hoy (para marcar «ahora» y atenuar lo pasado)
 *   franja:   la mejor franja del electrodoméstico (o null) y `electro` para su nombre
 *   animar:   true para que las barras crezcan (al cambiar de día)
 */
export function pintarGrafico(datos) {
  const { horas, resumen, nivelDe, ahora, esHoy, franja, electro, animar } = datos;

  // Si cambiamos de día, olvidamos la barra elegida
  if (!datosGrafico || datosGrafico.horas[0].inicio.getTime() !== horas[0].inicio.getTime()) {
    barraElegida = null;
  }
  datosGrafico = datos;
  $('#con-datos').hidden = false;
  $('#sin-manana').hidden = true;

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
    const nivel = nivelDe(h.precio);
    const pasada = esHoy && h.fin <= ahora;
    const alto = Math.max(1.5, (Math.max(0, h.precio) / tope) * 100);
    return `
      <button type="button" class="barra nivel--${nivel}${pasada ? ' barra--pasada' : ''}"
        data-i="${i}" style="--alto:${alto.toFixed(2)}%;--i:${i}"
        aria-label="De ${hora(h.inicio)} a ${hora(h.fin)}: ${precio(h.precio)} euros el kilovatio hora. ${NOMBRE_NIVEL[nivel]}.">
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
      // La etiqueta va centrada encima, salvo pegada a un borde
      const centro = (desde + hasta) / 2;
      const lado = centro < 18 ? 'izquierda' : centro > 82 ? 'derecha' : 'centro';
      const x = lado === 'izquierda' ? desde : lado === 'derecha' ? hasta : centro;
      etiquetaHTML = `
        <span class="grafico__etiqueta-franja grafico__etiqueta-franja--${lado}" style="left:${x}%">
          <svg class="icono" aria-hidden="true"><use href="#${electro.icono}"></use></svg>${electro.nombre}
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
  const distanciaMinima = (34 / ancho) * 100; // unos 34 px, en % del ancho
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

  // Mínimo, media y máximo
  ponerHTML($('#resumen'), `
    <div><dt>Mínimo</dt><dd>${precio(resumen.minima.precio)}</dd><dd class="resumen__nota">a ${laHora(resumen.minima.inicio)}</dd></div>
    <div><dt>Media</dt><dd>${precio(resumen.media)}</dd><dd class="resumen__nota">€/kWh</dd></div>
    <div><dt>Máximo</dt><dd>${precio(resumen.maxima.precio)}</dd><dd class="resumen__nota">a ${laHora(resumen.maxima.inicio)}</dd></div>`);

  // La misma información en una tabla (útil para leer cifras exactas y para lectores de pantalla)
  ponerHTML($('#tabla'), horas.map((h) => {
    const nivel = nivelDe(h.precio);
    const clase = esHoy && h.fin <= ahora ? 'pasada' : esHoy && h.inicio <= ahora ? 'actual' : '';
    return `
      <tr class="${clase}">
        <td>${hora(h.inicio)} – ${hora(h.fin)}</td>
        <td>${precio(h.precio)}</td>
        <td><span class="punto nivel--${nivel}"></span>${NOMBRE_NIVEL[nivel]}</td>
      </tr>`;
  }).join(''));

  actualizarLectura();
}

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
  const nivel = nivelDe(h.precio);
  lectura.innerHTML = `
    <span class="lectura__valor">${precio(h.precio)} <span class="lectura__unidad">€/kWh</span></span>
    <span class="lectura__detalle"><span class="punto nivel--${nivel}"></span>${hora(h.inicio)} – ${hora(h.fin)} · ${NOMBRE_NIVEL[nivel]}${extra}</span>`;
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
    if (!evento.target.closest('.grafico__area')) return;
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
    if (evento.pointerType === 'mouse' && barraElegida !== null) {
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
