/*
 * interfaz.js (gasolina)
 * ------------------------------------------------------------------
 * Pinta la app de la gasolina con los datos que le pasa app.js.
 * Igual que en la app de la luz, solo metemos en el HTML textos nuestros
 * y números ya formateados. Los textos que vienen del Ministerio (marcas,
 * direcciones…) pasan siempre por texto(), que los «escapa».
 */

import { icono } from '../comun/iconos.js';

const formatoPrecio = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formatoLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const formatoCorto = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const NOMBRE_NIVEL = { barata: 'Barata', media: 'Normal', cara: 'Cara' };
export const NIVELES5 = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];
export const NOMBRES_CARBURANTE = { g95: 'Gasolina 95', g98: 'Gasolina 98', diesel: 'Diésel', dieselPremium: 'Diésel Premium', glp: 'GLP (autogás)' };

export const precio = (valor) => formatoPrecio.format(valor);          // 1.5501 → "1,550"
const euros = (valor) => formatoEuros.format(valor);                    // 62 → "62,00 €"
const fechaUTC = (fecha) => new Date(`${fecha}T12:00:00Z`);
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const fechaLarga = (fecha) => mayuscula(formatoLargo.format(fechaUTC(fecha)));
export const fechaCorta = (fecha) => formatoCorto.format(fechaUTC(fecha)).replace('.', '');
export const distancia = (km) => (km < 1 ? `${Math.round(km * 1000 / 10) * 10} m` : `${km.toLocaleString('es-ES', { maximumFractionDigits: 1 })} km`);
const $ = (selector) => document.querySelector(selector);
const prefiereMenosMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Escapa un texto que viene de fuera para meterlo en HTML sin riesgos */
export function texto(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Diferencia en céntimos con su flecha: «▲ 1,8 cént.» */
export function variacionHTML(diferencia) {
  const centimos = Math.abs(diferencia * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  if (Math.abs(diferencia) < 0.0005) return '<span class="variacion variacion--igual">= igual</span>';
  const sube = diferencia > 0;
  return `<span class="variacion variacion--${sube ? 'sube' : 'baja'}">${icono(sube ? 'i-sube' : 'i-baja')}${sube ? '+' : '−'}${centimos} cént.</span>`;
}

// Colores de algunas marcas para su «avatar» (las demás reciben un color pastel)
const COLOR_MARCA = {
  REPSOL: '#ff8200', CEPSA: '#e2001a', MOEVE: '#0f8b8d', SHELL: '#f5c400', BP: '#00914b', GALP: '#ff6a13',
  PLENOIL: '#1aa3dd', BALLENOIL: '#0055a5', PETROPRIX: '#e30613', CARREFOUR: '#004e9f', ALCAMPO: '#d6001c',
  EROSKI: '#e2001a', AVIA: '#e30613', PETRONOR: '#003f87', DISA: '#00843d', BONAREA: '#e6007e',
};

/** Circulito con las iniciales de la marca */
export function avatar(marca) {
  const color = COLOR_MARCA[marca.clave] ?? `hsl(${[...marca.clave].reduce((s, c) => s + c.charCodeAt(0), 0) % 360} 55% 62%)`;
  const iniciales = marca.nombre.replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  return `<span class="avatar${marca.clave === 'SHELL' ? ' avatar--claro' : ''}" style="--marca:${color}" aria-hidden="true">${texto(iniciales.slice(0, 2))}</span>`;
}

/** Enlaces para abrir la gasolinera en las apps de mapas (con la ruta hasta allí) */
export function enlacesMapas(estacion) {
  const destino = `${estacion.lat},${estacion.lon}`;
  const nombre = encodeURIComponent(`${estacion.marca.nombre} ${estacion.direccion}`);
  return {
    apple: `https://maps.apple.com/?daddr=${destino}&q=${nombre}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${destino}`,
  };
}


/* ---------- 1. Carburantes (precio medio de España) ---------- */

/** lista: [{ id, nombre, precio, semana (diferencia con hace 7 días), puntos (últimos 30 días) }] */
export function pintarCarburantes(lista, elegido) {
  $('#carburantes').innerHTML = lista.map((c) => `
    <button type="button" class="carburante" data-id="${c.id}" aria-pressed="${c.id === elegido}"
      aria-label="${c.nombre}: ${precio(c.precio)} euros el litro de media">
      <span class="carburante__nombre">${c.nombre}</span>
      <span class="carburante__precio">${precio(c.precio)}<small>€/l</small></span>
      ${variacionHTML(c.semana)}
      ${minilinea(c.puntos)}
    </button>`).join('');
}

function minilinea(puntos) {
  const minimo = Math.min(...puntos);
  const maximo = Math.max(...puntos);
  const rango = maximo - minimo || 1;
  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${((i / (puntos.length - 1)) * 100).toFixed(1)} ${(26 - ((p - minimo) / rango) * 24).toFixed(1)}`).join(' ');
  return `<svg class="minilinea" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}


/* ---------- 2. Buscador ---------- */

const ICONO_SUGERENCIA = { cp: 'i-correo', municipio: 'i-lugar', provincia: 'i-lugar', marca: 'i-surtidor', estacion: 'i-surtidor' };

export function pintarSugerencias(lista, activa) {
  const caja = $('#sugerencias');
  const entrada = $('#busqueda');
  if (!lista.length) {
    caja.hidden = true;
    entrada.setAttribute('aria-expanded', 'false');
    entrada.removeAttribute('aria-activedescendant');
    return;
  }
  caja.innerHTML = lista.map((s, i) => `
    <li class="sugerencia${i === activa ? ' sugerencia--activa' : ''}" id="sugerencia-${i}" role="option"
      aria-selected="${i === activa}" data-indice="${i}">
      ${icono(ICONO_SUGERENCIA[s.tipo] ?? 'i-lugar')}
      <span class="sugerencia__texto"><strong>${texto(s.texto)}</strong><small>${texto(s.detalle)}</small></span>
    </li>`).join('');
  caja.hidden = false;
  entrada.setAttribute('aria-expanded', 'true');
  if (activa >= 0) entrada.setAttribute('aria-activedescendant', `sugerencia-${activa}`);
  else entrada.removeAttribute('aria-activedescendant');
}


/* ---------- 3. Mapa: zona, filtros, tarjeta, recomendada y lista ---------- */

/** Chips con lo que se está filtrando (cada uno con su ×) */
export function pintarFiltros({ zona, marca, solo24h, total }) {
  const chips = [];
  if (zona) chips.push(`<button type="button" class="chip chip--quitar" data-quitar="zona">${icono('i-lugar')}${texto(zona)}<span aria-hidden="true">×</span><span class="solo-lectores">(quitar)</span></button>`);
  if (marca) chips.push(`<button type="button" class="chip chip--quitar" data-quitar="marca">Solo ${texto(marca)}<span aria-hidden="true">×</span><span class="solo-lectores">(quitar)</span></button>`);
  chips.push(`<button type="button" class="chip" data-filtro="24h" aria-pressed="${solo24h}">Abiertas 24 h</button>`);
  $('#filtros').innerHTML = chips.join('');
  $('#cuantas').textContent = total === null ? '' : `${total.toLocaleString('es-ES')} ${total === 1 ? 'gasolinera' : 'gasolineras'}`;
}

export function mostrarMapaVacio(visible) {
  $('#mapa-vacio').hidden = !visible;
  $('#resultados').hidden = visible;
}

export function mostrarCargandoMapa(texto) {
  $('#mapa-cargando').hidden = !texto;
  $('#mapa-cargando').textContent = texto || '';
}

/** Tarjeta pequeña encima del mapa al tocar una gasolinera */
export function pintarTarjetaMapa(datos) {
  const caja = $('#mapa-tarjeta');
  if (!datos) {
    caja.hidden = true;
    return;
  }
  const { estacion, precioActual, nivel, recomendada, km, carburante, otrasDeLaMarca } = datos;
  const mapas = enlacesMapas(estacion);
  caja.innerHTML = `
    <div class="tarjeta-mapa__cabecera">
      ${avatar(estacion.marca)}
      <div class="tarjeta-mapa__nombre">
        <p><strong>${texto(estacion.marca.nombre)}</strong>${recomendada ? ' <span class="estrella">★ Recomendada</span>' : ''}</p>
        <p>${texto(estacion.direccion)} · ${texto(estacion.municipio.nombre)}</p>
      </div>
      <button type="button" class="tarjeta-mapa__cerrar" data-accion="cerrar" aria-label="Cerrar">${icono('i-cerrar')}</button>
    </div>
    <p class="tarjeta-mapa__precio">
      ${precioActual ? `<strong>${precio(precioActual)} €/l</strong> <span class="etiqueta nivel5--${nivel}">${NIVELES5[nivel - 1]}</span>` : '<strong>Sin precio</strong>'}
      <small>${NOMBRES_CARBURANTE[carburante]}${km !== null ? ` · a ${distancia(km)}` : ''}</small>
    </p>
    <div class="tarjeta-mapa__acciones">
      <a class="boton boton--mapa" href="${mapas.apple}" target="_blank" rel="noopener">${icono('i-navegar')}<span><small>Abrir en</small>Apple Maps</span></a>
      <a class="boton boton--mapa" href="${mapas.google}" target="_blank" rel="noopener">${icono('i-navegar')}<span><small>Abrir en</small>Google Maps</span></a>
    </div>
    <div class="tarjeta-mapa__mas">
      ${otrasDeLaMarca ? `<button type="button" class="chip" data-accion="marca">${icono('i-surtidor')}Ver solo ${texto(estacion.marca.nombre)}</button>` : ''}
      <button type="button" class="chip" data-accion="ficha">Ficha completa ${icono('i-abajo')}</button>
    </div>`;
  caja.hidden = false;
  if (!prefiereMenosMovimiento()) {
    caja.classList.remove('tarjeta-mapa--entra');
    void caja.offsetWidth;
    caja.classList.add('tarjeta-mapa--entra');
  }
}

/** Tarjeta destacada con la gasolinera recomendada */
export function pintarRecomendada(datos) {
  const caja = $('#recomendada');
  if (!datos) {
    caja.hidden = true;
    return;
  }
  const { estacion, precioActual, motivo, km } = datos;
  caja.hidden = false;
  caja.innerHTML = `
    <button type="button" class="recomendada__boton" data-id="${estacion.id}">
      <span class="recomendada__estrella" aria-hidden="true">★</span>
      <span class="recomendada__texto">
        <small>Recomendada · ${texto(motivo)}</small>
        <strong>${texto(estacion.marca.nombre)} · ${precio(precioActual)} €/l</strong>
        <span>${texto(estacion.direccion)}, ${texto(estacion.municipio.nombre)}${km !== null ? ` · a ${distancia(km)}` : ''}</span>
      </span>
      ${icono('i-flecha')}
    </button>`;
}

/** Lista de las más baratas. items: [{ estacion, precio, nivel, km }] */
export function pintarLista(items, { todas, orden, conUbicacion }) {
  const visibles = todas ? items.slice(0, 30) : items.slice(0, 5);
  $('#lista-titulo').textContent = orden === 'distancia' ? 'Las más cercanas' : 'Las más baratas';
  $('#orden-lista').hidden = !conUbicacion;
  for (const boton of document.querySelectorAll('[data-orden]')) boton.setAttribute('aria-pressed', String(boton.dataset.orden === orden));
  $('#lista-gasolineras').innerHTML = visibles.map((item, i) => `
    <li>
      <button type="button" class="gasolinera tocable" data-id="${item.estacion.id}">
        <span class="gasolinera__puesto">${i + 1}</span>
        ${avatar(item.estacion.marca)}
        <span class="gasolinera__texto">
          <strong>${texto(item.estacion.marca.nombre)}</strong>
          <small>${texto(item.estacion.direccion)} · ${texto(item.estacion.municipio.nombre)}</small>
        </span>
        <span class="gasolinera__precio">
          <strong><span class="punto nivel5--${item.nivel}"></span>${precio(item.precio)}</strong>
          <small>${item.km !== null ? distancia(item.km) : '€/l'}</small>
        </span>
      </button>
    </li>`).join('') || '<li class="lista-vacia">No hay gasolineras con estos filtros.</li>';
  const boton = $('#ver-mas-lista');
  boton.hidden = items.length <= 5;
  boton.setAttribute('aria-expanded', String(todas));
  boton.querySelector('span').textContent = todas ? 'Ver menos' : 'Ver más';
}


/* ---------- 4. Ficha completa de una gasolinera ---------- */

/**
 * estacion · niveles: { g95: 2, … } (nivel de cada precio en su zona) · km · carburante elegido
 */
export function pintarFicha({ estacion, niveles, km, carburante, fecha, otrasDeLaMarca }) {
  const mapas = enlacesMapas(estacion);
  const filas = Object.entries(NOMBRES_CARBURANTE).map(([id, nombre]) => {
    const valor = estacion.precios[id];
    return `
      <li class="ficha__precio${id === carburante ? ' ficha__precio--elegido' : ''}">
        <span>${nombre}</span>
        ${valor ? `<strong>${precio(valor)} €/l</strong>${niveles[id] ? `<span class="etiqueta nivel5--${niveles[id]}">${NIVELES5[niveles[id] - 1]}</span>` : '<span></span>'}`
    : '<span class="ficha__no">No tiene</span><span></span>'}
      </li>`;
  }).join('');

  $('#ficha').innerHTML = `
    <div class="ficha__cabecera">
      ${avatar(estacion.marca)}
      <div>
        <p class="ficha__marca">${texto(estacion.marca.nombre)}${estacion.rotulo && estacion.rotulo.toUpperCase() !== estacion.marca.nombre.toUpperCase() ? ` <small>(${texto(estacion.rotulo)})</small>` : ''}</p>
        <p class="ficha__direccion">${texto(estacion.direccion)}<br>${texto(estacion.cp)} ${texto(estacion.municipio.nombre)} (${texto(estacion.provincia.nombre)})</p>
      </div>
    </div>
    <dl class="ficha__datos">
      <div><dt>Horario</dt><dd>${texto(estacion.horario || 'No indicado')}</dd></div>
      ${km !== null ? `<div><dt>Distancia</dt><dd>${distancia(km)}</dd></div>` : ''}
      <div><dt>Precios del</dt><dd>${fechaCorta(fecha)}</dd></div>
    </dl>
    <p class="ficha__subtitulo">Precio por litro</p>
    <ul class="ficha__precios">${filas}</ul>
    <div class="ficha__acciones">
      ${otrasDeLaMarca ? `<button type="button" class="boton boton--suave" data-accion="marca">${icono('i-surtidor')}Ver gasolineras de ${texto(estacion.marca.nombre)}</button>` : ''}
      <a class="boton boton--mapa" href="${mapas.apple}" target="_blank" rel="noopener">${icono('i-navegar')}Apple Maps</a>
      <a class="boton boton--mapa" href="${mapas.google}" target="_blank" rel="noopener">${icono('i-navegar')}Google Maps</a>
    </div>`;
  $('#bloque-ficha').hidden = false;
}

export function ocultarFicha() {
  $('#bloque-ficha').hidden = true;
}

/** Botones de carburante del historial (solo los que vende esa gasolinera) */
export function pintarCarburantesHistorial(ids, elegido) {
  $('#carburantes-historial').innerHTML = ids.map((id) => `
    <button type="button" class="chip" data-carburante="${id}" aria-pressed="${id === elegido}">${NOMBRES_CARBURANTE[id]}</button>`).join('');
}

export function pintarEstadoHistorial(mensaje) {
  $('#historial-estado').hidden = !mensaje;
  $('#historial-estado').textContent = mensaje || '';
}

export function marcarDiasHistorial(dias) {
  for (const boton of document.querySelectorAll('[data-dias]')) boton.setAttribute('aria-pressed', String(Number(boton.dataset.dias) === dias));
}

/** Un día del historial de la gasolinera (al tocar el calendario) */
export function pintarDiaEstacion({ dia, ultimo, carburante }) {
  if (!dia) {
    $('#dia-estacion').innerHTML = '';
    return;
  }
  const diferencia = dia.precio - ultimo.precio;
  $('#dia-estacion').innerHTML = `
    <p class="dia-elegido__fecha">${fechaLarga(dia.fecha)}</p>
    <p class="dia-elegido__precio">${precio(dia.precio)} <small>€/l · ${NOMBRES_CARBURANTE[carburante]}</small></p>
    <p class="dia-elegido__texto">${dia.fecha === ultimo.fecha ? 'Es el último precio que tenemos.' : `${variacionHTML(diferencia)} frente al último precio.`}</p>`;
}


/* ---------- 5. Precio medio de España: destacado, calculadora y día elegido ---------- */

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
      <p class="destacado__titulo"><strong>${carburante.nombre}</strong> · media de España, ${fechaCorta(hoy.fecha)}</p>
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

export function marcarPeriodo(dias) {
  for (const boton of document.querySelectorAll('[data-periodo]')) {
    boton.setAttribute('aria-pressed', String(Number(boton.dataset.periodo) === dias));
  }
}

export function pintarDiaElegido({ carburante, dia, hoy, litros }) {
  const diferencia = dia.precio - hoy.precio;
  const esHoy = dia.fecha === hoy.fecha;
  const porcentaje = Math.abs((diferencia / hoy.precio) * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  $('#dia-elegido').innerHTML = `
    <p class="dia-elegido__fecha">${fechaLarga(dia.fecha)}</p>
    <p class="dia-elegido__precio">${precio(dia.precio)} <small>€/l · ${carburante.nombre} (media de España)</small></p>
    <p class="dia-elegido__texto">${esHoy
      ? `Es el precio de hoy. Llenar ${litros} litros cuesta ${euros(litros * dia.precio)}.`
      : `${variacionHTML(diferencia)} (un ${porcentaje} %) frente a hoy. Llenar ${litros} litros ese día costaba ${euros(litros * dia.precio)}.`}</p>`;
}

export function pintarFecha(textoFecha) {
  $('#fecha').textContent = textoFecha;
}

export function pintarEstado(mensaje) {
  $('#estado').textContent = mensaje;
  $('#estado').hidden = !mensaje;
}

export function pintarError(mensaje) {
  $('#destacado').className = 'tarjeta destacado';
  $('#destacado').innerHTML = `
    <p class="destacado__titulo"><strong>No hemos podido cargar los precios</strong></p>
    <p class="destacado__texto">${mensaje}</p>
    <button type="button" class="boton" data-accion="reintentar" style="margin-top:14px">Reintentar</button>`;
}

export function irA(selector, bloque = 'center') {
  $(selector).scrollIntoView({ behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth', block: bloque });
}
