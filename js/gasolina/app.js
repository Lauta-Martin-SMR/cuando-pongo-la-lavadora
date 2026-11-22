/*
 * app.js (gasolina) — el punto de entrada de la app de la gasolina
 * ------------------------------------------------------------------
 * Dos partes:
 *   1. El mapa: todas las gasolineras de la zona que busques, con su precio,
 *      la recomendada, su ficha, su historial y los enlaces a Apple/Google Maps.
 *   2. El precio medio de España: tarjetas, calculadora, gráfico y calendario.
 *
 * Los datos los prepara cada día GitHub (herramientas/actualizar-gasolina.mjs).
 */

import { serieDe, precioHace, resumen, nivel, tendencia, nivelesQuintiles, elegirRecomendada } from './calculos.js';
import * as interfaz from './interfaz.js';
import { crearLinea } from './linea.js';
import { crearMapa } from './mapa.js';
import { cargarEstaciones, sugerencias, distanciaKm, historialDe, normalizar, CARBURANTES } from './estaciones.js';
import { crearSitios } from './sitios.js';
import { datosAyudaGasolina } from './ayuda-gasolina.js';
import { aplicarAjustes, iniciarPanel } from '../comun/ajustes.js';
import { crearCalendario, nivelesPorTercios } from '../comun/calendario.js';
import { iniciarAyuda } from '../comun/ayuda.js';
import { iniciarConmutador } from '../comun/conmutador.js';
import { crearLineaDesplazamiento } from '../comun/linea-desplazamiento.js';

const ARCHIVO = new URL('../../datos/gasolina.json', import.meta.url);
const CLAVE = 'cuando-lavadora:gasolina';
const RADIO_CERCA = 10; // km de «Cerca de mí»
const $ = (selector) => document.querySelector(selector);

const estado = {
  // Precio medio de España
  datos: null,
  carburante: 'g95',
  litros: 40,
  periodo: 0,          // días del gráfico (0 = todos, unos 6 meses)
  fechaElegida: null,  // día elegido en el calendario de España
  // Mapa
  estaciones: null,    // todas las gasolineras (se cargan al usar el mapa)
  zona: null,          // { tipo: 'municipio' | 'provincia' | 'cp' | 'cerca' | 'espana', valor, nombre }
  marca: null,         // clave de la marca para filtrar (por ejemplo 'SHELL')
  solo24h: false,
  orden: 'precio',
  listaCompleta: false,
  ubicacion: null,     // [lat, lon] si la persona ha pulsado «Cerca de mí»
  elegidaId: null,
  // Ficha de la gasolinera elegida
  historial: null,
  diasHistorial: 30,
  carburanteHistorial: null,
  fechaHistorial: null,
};

// Recordamos lo de la última vez (carburante, litros, zona y filtros)
try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE)) ?? {};
  for (const clave of ['carburante', 'litros', 'zona', 'marca', 'solo24h']) {
    if (guardado[clave] !== undefined) estado[clave] = guardado[clave];
  }
  if (estado.zona?.tipo === 'cerca') estado.zona = null; // la ubicación no se guarda
} catch {
  // nada guardado
}
function guardar() {
  try {
    const { carburante, litros, zona, marca, solo24h } = estado;
    localStorage.setItem(CLAVE, JSON.stringify({ carburante, litros, zona: zona?.tipo === 'cerca' ? null : zona, marca, solo24h }));
  } catch {
    // navegación privada
  }
}


/* =====================================================================
   1. EL MAPA DE GASOLINERAS
   ===================================================================== */

const mapa = crearMapa($('#mapa'), { alElegir: (id) => elegirEstacion(id) });

/** Descarga las gasolineras de España (solo la primera vez) */
async function asegurarEstaciones() {
  if (estado.estaciones) return true;
  interfaz.mostrarCargandoMapa('Cargando las gasolineras de España…');
  try {
    estado.estaciones = await cargarEstaciones();
    return true;
  } catch {
    interfaz.mostrarCargandoMapa('No se han podido cargar las gasolineras. Revisa tu conexión.');
    setTimeout(() => interfaz.mostrarCargandoMapa(''), 4000);
    return false;
  } finally {
    if (estado.estaciones) interfaz.mostrarCargandoMapa('');
  }
}

const kmA = (estacion) => (estado.ubicacion ? distanciaKm(estado.ubicacion[0], estado.ubicacion[1], estacion.lat, estacion.lon) : null);

/** Las gasolineras de la zona elegida que venden el carburante elegido */
function estacionesDeZona(carburante = estado.carburante) {
  const { lista } = estado.estaciones;
  const { tipo, valor } = estado.zona;
  let zona;
  if (tipo === 'municipio') zona = lista.filter((e) => e.municipio.id === valor);
  else if (tipo === 'provincia') zona = lista.filter((e) => e.provincia.id === valor);
  else if (tipo === 'cp') zona = lista.filter((e) => e.cp.startsWith(valor));
  else if (tipo === 'cerca') zona = lista.filter((e) => kmA(e) <= RADIO_CERCA);
  else zona = lista;
  return zona.filter((e) => e.publica && e.precios[carburante]);
}

/** Calcula lo que enseña el mapa: niveles de precio (en la zona), filtros y orden */
function calcularMapa() {
  const c = estado.carburante;
  const zona = estacionesDeZona();
  const nivelDe = nivelesQuintiles(zona.map((e) => e.precios[c]));
  let items = zona.map((e) => ({ estacion: e, precio: e.precios[c], nivel: nivelDe(e.precios[c]), km: kmA(e) }));
  if (estado.marca) items = items.filter((item) => item.estacion.marca.clave === estado.marca);
  if (estado.solo24h) items = items.filter((item) => /24\s*H/i.test(item.estacion.horario));
  const orden = estado.orden === 'distancia' && estado.ubicacion
    ? (a, b) => a.km - b.km
    : (a, b) => a.precio - b.precio || (a.km ?? 0) - (b.km ?? 0);
  return items.sort(orden);
}

function nombreZona() {
  const z = estado.zona;
  if (!z) return null;
  if (z.tipo === 'espana') return 'Toda España';
  if (z.tipo === 'cerca') return `A menos de ${RADIO_CERCA} km de ti`;
  return z.nombre;
}

let itemsMapa = [];

function pintarMapa({ encuadrar = false } = {}) {
  if (!estado.zona || !estado.estaciones) {
    interfaz.mostrarMapaVacio(true);
    interfaz.pintarFiltros({ zona: null, marca: null, solo24h: estado.solo24h, total: null });
    mapa.mostrar([], { encuadrar: false });
    cerrarEstacion();
    sitios.pintar();
    return;
  }
  interfaz.mostrarMapaVacio(false);
  itemsMapa = calcularMapa();
  const recomendada = elegirRecomendada(itemsMapa, Boolean(estado.ubicacion));
  mapa.mostrar(itemsMapa, { recomendada: recomendada?.item, encuadrar });
  const marca = estado.marca ? estado.estaciones.marcas.get(estado.marca)?.nombre ?? estado.marca : null;
  interfaz.pintarFiltros({ zona: nombreZona(), marca, solo24h: estado.solo24h, total: itemsMapa.length });
  interfaz.pintarRecomendada(recomendada && {
    estacion: recomendada.item.estacion, precioActual: recomendada.item.precio, motivo: recomendada.motivo, km: recomendada.item.km,
  });
  estado.recomendadaId = recomendada?.item.estacion.id ?? null;
  interfaz.pintarLista(itemsMapa, { todas: estado.listaCompleta, orden: estado.orden, conUbicacion: Boolean(estado.ubicacion) });

  // Si había una gasolinera elegida, actualizamos su tarjeta (o la cerramos si ya no está)
  if (estado.elegidaId) {
    if (itemsMapa.some((item) => item.estacion.id === estado.elegidaId)) elegirEstacion(estado.elegidaId, { acercar: false, recargar: false });
    else cerrarEstacion();
  }
  sitios.pintar(); // «Guardar lo que veo» y el sitio que se está viendo
}

/** Cambia la zona y repinta (encuadrando el mapa en ella) */
async function ponerZona(zona, { quitarMarca = true } = {}) {
  if (!(await asegurarEstaciones())) return;
  estado.zona = zona;
  if (quitarMarca) estado.marca = null;
  estado.listaCompleta = false;
  cerrarEstacion();
  guardar();
  pintarMapa({ encuadrar: true });
}


/* ---------- Gasolinera elegida: tarjeta en el mapa y ficha completa ---------- */

function elegirEstacion(id, { acercar = true, recargar = true } = {}) {
  const estacion = estado.estaciones.lista.find((e) => e.id === id);
  if (!estacion) return;
  const cambia = estado.elegidaId !== id;
  estado.elegidaId = id;

  const item = itemsMapa.find((i) => i.estacion.id === id);
  const otrasDeLaMarca = (estado.estaciones.marcas.get(estacion.marca.clave)?.cuantas ?? 0) > 1 && estado.marca !== estacion.marca.clave;
  interfaz.pintarTarjetaMapa({
    estacion,
    precioActual: estacion.precios[estado.carburante] ?? null,
    nivel: item?.nivel ?? 3,
    recomendada: id === estado.recomendadaId,
    km: kmA(estacion),
    carburante: estado.carburante,
    otrasDeLaMarca,
  });
  // La tarjeta tapa la parte de abajo del mapa: la gasolinera se coloca encima
  mapa.elegir(id, { acercar, margenAbajo: $('#mapa-tarjeta').offsetHeight + 10 });

  // Nivel de cada carburante de esta gasolinera, comparado con su zona
  const niveles = {};
  for (const c of CARBURANTES) {
    if (!estacion.precios[c] || !estado.zona) continue;
    const nivelDe = nivelesQuintiles(estacionesDeZona(c).map((e) => e.precios[c]));
    niveles[c] = nivelDe(estacion.precios[c]);
  }
  interfaz.pintarFicha({ estacion, niveles, km: kmA(estacion), carburante: estado.carburante, fecha: estado.estaciones.fecha, otrasDeLaMarca });

  if (cambia) {
    estado.carburanteHistorial = null;
    estado.fechaHistorial = null;
  }
  if (cambia || recargar) cargarHistorial(estacion);
}

function cerrarEstacion() {
  estado.elegidaId = null;
  mapa.deseleccionar();
  interfaz.pintarTarjetaMapa(null);
  interfaz.ocultarFicha();
}

/** Solo las gasolineras de la marca de la elegida (en su provincia, o en toda España) */
function verMarca() {
  const estacion = estado.estaciones.lista.find((e) => e.id === estado.elegidaId);
  if (!estacion) return;
  estado.marca = estacion.marca.clave;
  if (['municipio', 'cp'].includes(estado.zona?.tipo)) {
    // En un pueblo suele haber una sola: mejor enseñar las de toda la provincia
    estado.zona = { tipo: 'provincia', valor: estacion.provincia.id, nombre: `Provincia de ${estacion.provincia.nombre}` };
  }
  estado.listaCompleta = false;
  guardar();
  pintarMapa({ encuadrar: true });
  navigator.vibrate?.(8);
}


/* ---------- Historial de la gasolinera elegida (gráfico y calendario) ---------- */

const graficoEstacion = crearLinea({ caja: $('#grafico-estacion'), lectura: $('#lectura-estacion'), variacion: interfaz.variacionHTML });
const calendarioEstacion = crearCalendario($('#calendario-estacion'), {
  alElegir(fecha) {
    estado.fechaHistorial = fecha;
    pintarHistorial({ animar: false });
  },
});
let historialPedido = 0;

async function cargarHistorial(estacion) {
  const pedido = ++historialPedido;
  interfaz.pintarEstadoHistorial('Cargando el historial de precios…');
  $('#contenido-historial').hidden = true;
  try {
    const historial = await historialDe(estacion, estado.diasHistorial, (hechos, total) => {
      if (pedido === historialPedido) interfaz.pintarEstadoHistorial(`Cargando el historial de precios… ${hechos} de ${total} días`);
    });
    if (pedido !== historialPedido) return; // mientras tanto se eligió otra gasolinera
    estado.historial = historial;
    pintarHistorial({ animar: true });
  } catch {
    if (pedido === historialPedido) interfaz.pintarEstadoHistorial('No se ha podido cargar el historial. Revisa tu conexión.');
  }
}

function pintarHistorial({ animar }) {
  const historial = estado.historial ?? [];
  const disponibles = CARBURANTES.filter((c) => historial.some((d) => d.precios[c]));
  if (!disponibles.length) {
    interfaz.pintarEstadoHistorial('Todavía no hay historial de esta gasolinera.');
    $('#contenido-historial').hidden = true;
    return;
  }
  if (!disponibles.includes(estado.carburanteHistorial)) {
    estado.carburanteHistorial = disponibles.includes(estado.carburante) ? estado.carburante : disponibles[0];
  }
  const c = estado.carburanteHistorial;
  interfaz.pintarCarburantesHistorial(disponibles, c);
  interfaz.marcarDiasHistorial(estado.diasHistorial);
  interfaz.pintarEstadoHistorial('');
  $('#contenido-historial').hidden = false;

  const serie = historial.filter((d) => d.precios[c]).map((d) => ({ fecha: d.fecha, precio: d.precios[c] }));
  const ultimo = serie[serie.length - 1];
  const elegido = serie.find((d) => d.fecha === estado.fechaHistorial) ?? ultimo;
  graficoEstacion.pintar(serie, { animar, fecha: elegido.fecha });

  const valores = new Map(serie.map((d) => [d.fecha, d.precio]));
  const niveles = nivelesPorTercios(valores);
  calendarioEstacion.pintar({
    dias: new Map(serie.map((d) => [d.fecha, {
      nivel: niveles.get(d.fecha),
      texto: d.precio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      etiqueta: `${interfaz.precio(d.precio)} euros el litro`,
    }])),
    min: serie[0].fecha,
    max: ultimo.fecha,
    hoy: ultimo.fecha,
    elegido: elegido.fecha,
    leyenda: { izquierda: 'Más barata', derecha: 'Más cara' },
  });
  interfaz.pintarDiaEstacion({ dia: elegido, ultimo, carburante: c });
}


/* ---------- Buscador ---------- */

const entrada = $('#busqueda');
let lista = [];
let activa = -1;

async function actualizarSugerencias() {
  const textoBuscado = entrada.value;
  $('#borrar-busqueda').hidden = !textoBuscado;
  if (normalizar(textoBuscado).length < 2) {
    lista = [];
    interfaz.pintarSugerencias(lista, -1);
    return;
  }
  if (!(await asegurarEstaciones())) return;
  if (entrada.value !== textoBuscado) return; // se ha seguido escribiendo
  lista = sugerencias(textoBuscado, estado.estaciones);
  activa = lista.length ? 0 : -1;
  interfaz.pintarSugerencias(lista, activa);
}

async function elegirSugerencia(s) {
  lista = [];
  interfaz.pintarSugerencias(lista, -1);
  entrada.value = s.tipo === 'marca' ? s.texto : s.tipo === 'estacion' ? s.texto : s.texto.replace(/^Provincia de /, '');
  $('#borrar-busqueda').hidden = false;
  entrada.blur();
  if (s.tipo === 'municipio') await ponerZona({ tipo: 'municipio', valor: s.valor, nombre: s.texto });
  else if (s.tipo === 'provincia') await ponerZona({ tipo: 'provincia', valor: s.valor, nombre: s.texto });
  else if (s.tipo === 'cp') await ponerZona({ tipo: 'cp', valor: s.valor, nombre: `C. P. ${s.valor}` });
  else if (s.tipo === 'marca') {
    estado.marca = s.valor;
    await ponerZona(estado.zona ?? { tipo: 'espana', valor: null, nombre: 'Toda España' }, { quitarMarca: false });
  } else if (s.tipo === 'estacion') {
    const estacion = estado.estaciones.lista.find((e) => e.id === s.valor);
    await ponerZona({ tipo: 'municipio', valor: estacion.municipio.id, nombre: estacion.municipio.nombre });
    elegirEstacion(estacion.id);
  }
  interfaz.irA('#bloque-mapa', 'start');
}

let espera;
entrada.addEventListener('input', () => {
  clearTimeout(espera);
  espera = setTimeout(actualizarSugerencias, 120);
});
entrada.addEventListener('focus', () => {
  asegurarEstaciones(); // vamos adelantando la descarga
  if (entrada.value) actualizarSugerencias();
});
entrada.addEventListener('keydown', (evento) => {
  if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
    if (!lista.length) return;
    evento.preventDefault();
    activa = (activa + (evento.key === 'ArrowDown' ? 1 : -1) + lista.length) % lista.length;
    interfaz.pintarSugerencias(lista, activa);
  } else if (evento.key === 'Enter') {
    evento.preventDefault();
    if (lista[activa]) elegirSugerencia(lista[activa]);
  } else if (evento.key === 'Escape') {
    lista = [];
    interfaz.pintarSugerencias(lista, -1);
  }
});
entrada.addEventListener('blur', () => setTimeout(() => interfaz.pintarSugerencias([], -1), 150));
// pointerdown (y no click) para elegir antes de que el campo pierda el foco
$('#sugerencias').addEventListener('pointerdown', (evento) => {
  const opcion = evento.target.closest('[data-indice]');
  if (!opcion) return;
  evento.preventDefault();
  elegirSugerencia(lista[Number(opcion.dataset.indice)]);
});
$('#borrar-busqueda').addEventListener('click', () => {
  entrada.value = '';
  $('#borrar-busqueda').hidden = true;
  lista = [];
  interfaz.pintarSugerencias(lista, -1);
  entrada.focus();
});


/* ---------- Cerca de mí ---------- */

function cercaDeMi() {
  if (!navigator.geolocation) {
    interfaz.mostrarCargandoMapa('Tu navegador no permite saber dónde estás.');
    setTimeout(() => interfaz.mostrarCargandoMapa(''), 3500);
    return;
  }
  interfaz.mostrarCargandoMapa('Buscando dónde estás…');
  navigator.geolocation.getCurrentPosition(async (posicion) => {
    estado.ubicacion = [posicion.coords.latitude, posicion.coords.longitude];
    mapa.ponerUbicacion(...estado.ubicacion);
    entrada.value = '';
    $('#borrar-busqueda').hidden = true;
    await ponerZona({ tipo: 'cerca', valor: null, nombre: 'Cerca de ti' });
    interfaz.irA('#bloque-mapa', 'start');
  }, () => {
    interfaz.mostrarCargandoMapa('No hemos podido saber dónde estás. Revisa el permiso de ubicación o busca un lugar.');
    setTimeout(() => interfaz.mostrarCargandoMapa(''), 4500);
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 });
}

$('#cerca-de-mi').addEventListener('click', cercaDeMi);


/* ---------- Mis sitios ---------- */

/** Un sitio guardado a partir de una sugerencia del buscador */
function sitioDeSugerencia(s) {
  if (s.tipo === 'municipio' || s.tipo === 'provincia') {
    return { nombre: s.texto, detalle: s.detalle, zona: { tipo: s.tipo, valor: s.valor, nombre: s.texto } };
  }
  if (s.tipo === 'cp') {
    return { nombre: `C. P. ${s.valor}`, detalle: s.detalle, zona: { tipo: 'cp', valor: s.valor, nombre: `C. P. ${s.valor}` } };
  }
  if (s.tipo === 'marca') {
    return { nombre: s.texto, detalle: s.detalle, zona: { tipo: 'espana', valor: null, nombre: 'Toda España' }, marca: s.valor };
  }
  const estacion = estado.estaciones.lista.find((e) => e.id === s.valor);
  return {
    nombre: s.texto, detalle: s.detalle, estacion: estacion.id,
    zona: { tipo: 'municipio', valor: estacion.municipio.id, nombre: estacion.municipio.nombre },
  };
}

/** Lo que se está viendo en el mapa, como sitio (para «Guardar lo que veo») */
function sitioActual() {
  const zona = estado.zona;
  if (!zona || zona.tipo === 'cerca' || !estado.estaciones) return null;
  const marca = estado.marca ? estado.estaciones.marcas.get(estado.marca)?.nombre ?? estado.marca : null;
  let nombre = zona.nombre;
  if (marca) nombre = zona.tipo === 'espana' ? marca : `${marca} · ${zona.nombre.replace(/^Provincia de /, '')}`;
  const cuantas = itemsMapa.length;
  return { nombre, detalle: `${cuantas.toLocaleString('es-ES')} ${cuantas === 1 ? 'gasolinera' : 'gasolineras'}`, zona, marca: estado.marca ?? null };
}

/** Enseña un sitio guardado en el mapa */
async function irASitio(sitio) {
  if (!(await asegurarEstaciones())) return;
  entrada.value = sitio.marca && sitio.zona.tipo === 'espana' ? sitio.nombre : sitio.zona.nombre.replace(/^Provincia de /, '');
  $('#borrar-busqueda').hidden = !entrada.value;
  estado.marca = sitio.marca ?? null;
  await ponerZona(sitio.zona, { quitarMarca: false });
  if (sitio.estacion && estado.estaciones.lista.some((e) => e.id === sitio.estacion)) elegirEstacion(sitio.estacion);
  interfaz.irA('#bloque-mapa', 'start');
}

const sitios = crearSitios({
  huecos: { lateral: $('#lateral-sitios'), mapa: $('#hueco-sitios-mapa'), vacio: $('#mapa-vacio-sitios') },
  boton: $('#abrir-sitios'),
  buscar: async (texto) => ((await asegurarEstaciones()) ? sugerencias(texto, estado.estaciones) : []),
  deSugerencia: sitioDeSugerencia,
  actual: sitioActual,
  alElegir: irASitio,
});


/* ---------- Botones del mapa ---------- */

// Pantalla vacía del mapa: «Cerca de mí» y ciudades rápidas
$('#mapa-vacio').addEventListener('click', async (evento) => {
  if (evento.target.closest('[data-accion="cerca"]')) return cercaDeMi();
  if (evento.target.closest('[data-accion="buscar"]')) return entrada.focus();
  const ciudad = evento.target.closest('[data-ciudad]');
  if (!ciudad || !(await asegurarEstaciones())) return;
  const [nombre, provincia] = ciudad.dataset.ciudad.split('|');
  const municipio = [...estado.estaciones.municipios.values()].find((m) => m.nombre === nombre && m.provincia === provincia);
  if (municipio) {
    entrada.value = municipio.nombre;
    $('#borrar-busqueda').hidden = false;
    await ponerZona({ tipo: 'municipio', valor: municipio.id, nombre: municipio.nombre });
  }
});

// Chips de filtros: quitar zona, quitar marca, abiertas 24 h
$('#filtros').addEventListener('click', (evento) => {
  const quitar = evento.target.closest('[data-quitar]');
  if (quitar?.dataset.quitar === 'zona') {
    entrada.value = '';
    $('#borrar-busqueda').hidden = true;
    if (estado.marca) ponerZona({ tipo: 'espana', valor: null, nombre: 'Toda España' }, { quitarMarca: false });
    else {
      estado.zona = null;
      guardar();
      mapa.verEspana();
      pintarMapa();
    }
  } else if (quitar?.dataset.quitar === 'marca') {
    estado.marca = null;
    if (estado.zona?.tipo === 'espana') estado.zona = null; // España entera sin filtro serían demasiadas
    guardar();
    pintarMapa({ encuadrar: true });
  } else if (evento.target.closest('[data-filtro="24h"]')) {
    estado.solo24h = !estado.solo24h;
    guardar();
    pintarMapa();
  }
});

// Tarjeta encima del mapa
$('#mapa-tarjeta').addEventListener('click', (evento) => {
  const accion = evento.target.closest('[data-accion]')?.dataset.accion;
  if (accion === 'cerrar') cerrarEstacion();
  if (accion === 'marca') verMarca();
  if (accion === 'ficha') interfaz.irA('#bloque-ficha', 'start');
});

// Recomendada y lista
$('#recomendada').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-id]');
  if (boton) {
    elegirEstacion(Number(boton.dataset.id));
    interfaz.irA('#mapa', 'center');
  }
});
$('#lista-gasolineras').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-id]');
  if (boton) {
    elegirEstacion(Number(boton.dataset.id));
    interfaz.irA('#mapa', 'center');
  }
});
$('#ver-mas-lista').addEventListener('click', () => {
  estado.listaCompleta = !estado.listaCompleta;
  interfaz.pintarLista(itemsMapa, { todas: estado.listaCompleta, orden: estado.orden, conUbicacion: Boolean(estado.ubicacion) });
  if (!estado.listaCompleta) interfaz.irA('#bloque-lista', 'start');
});
$('#orden-lista').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-orden]');
  if (!boton) return;
  estado.orden = boton.dataset.orden;
  pintarMapa();
});

// Ficha completa
$('#ficha').addEventListener('click', (evento) => {
  if (evento.target.closest('[data-accion="marca"]')) {
    verMarca();
    interfaz.irA('#bloque-mapa', 'start');
  }
});
$('#carburantes-historial').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-carburante]');
  if (!boton) return;
  estado.carburanteHistorial = boton.dataset.carburante;
  pintarHistorial({ animar: true });
});
for (const boton of document.querySelectorAll('[data-dias]')) {
  boton.addEventListener('click', () => {
    estado.diasHistorial = Number(boton.dataset.dias);
    const estacion = estado.estaciones?.lista.find((e) => e.id === estado.elegidaId);
    if (estacion) cargarHistorial(estacion);
  });
}


/* =====================================================================
   2. EL PRECIO MEDIO DE ESPAÑA
   ===================================================================== */

const graficoEspana = crearLinea({ caja: $('#grafico-gas'), lectura: $('#lectura-gas'), variacion: interfaz.variacionHTML });

async function cargar() {
  try {
    const respuesta = await fetch(ARCHIVO, { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    estado.datos = await respuesta.json();
    if (!estado.datos.carburantes.some((c) => c.id === estado.carburante)) estado.carburante = 'g95';
    pintarTodo({ animar: true });
  } catch {
    interfaz.pintarError('Comprueba tu conexión a internet y vuelve a intentarlo.');
  }
}

let contexto = null; // lo último pintado: al mover los litros solo se repinta lo que cambia

function pintarTodo({ animar = false } = {}) {
  const { datos } = estado;
  const carburante = datos.carburantes.find((c) => c.id === estado.carburante);
  const serie = serieDe(datos, carburante.id);
  const hoy = serie[serie.length - 1];
  const resumen6 = resumen(serie);

  interfaz.pintarFecha(`Precios de hoy, ${interfaz.fechaCorta(hoy.fecha)}`);
  const dias = Math.round((Date.now() - new Date(`${hoy.fecha}T12:00:00Z`)) / 86400000);
  interfaz.pintarEstado(dias > 2 ? `Los datos son del ${interfaz.fechaLarga(hoy.fecha).toLowerCase()}: la actualización automática puede haber fallado.` : '');

  interfaz.pintarCarburantes(datos.carburantes.map((c) => {
    const s = serieDe(datos, c.id);
    const ultimo = s[s.length - 1];
    return { ...c, precio: ultimo.precio, semana: ultimo.precio - precioHace(s, 7).precio, puntos: s.slice(-30).map((d) => d.precio) };
  }), carburante.id);

  const prevision = tendencia(serie);
  interfaz.pintarDestacado({
    carburante,
    hoy,
    semana: hoy.precio - precioHace(serie, 7).precio,
    mes: hoy.precio - precioHace(serie, 30).precio,
    nivel: nivel(hoy.precio, resumen6.media),
    resumen: resumen6,
    tendencia: prevision,
  });

  contexto = { serie, carburante, hoy, prevision };
  pintarLitros();

  interfaz.marcarPeriodo(estado.periodo);
  graficoEspana.pintar(estado.periodo ? serie.slice(-estado.periodo) : serie, { animar, fecha: estado.fechaElegida });
  pintarCalendarioEspana(serie, carburante, hoy);
}

function pintarLitros() {
  if (!contexto) return;
  const { serie, carburante, hoy, prevision } = contexto;
  interfaz.pintarCalculadora({ litros: estado.litros, hoy, esperado: prevision.esperado, haceUnMes: precioHace(serie, 30) });
  const elegida = serie.find((d) => d.fecha === estado.fechaElegida) ?? hoy;
  interfaz.pintarDiaElegido({ carburante, dia: elegida, hoy, litros: estado.litros });
}

const calendarioEspana = crearCalendario($('#calendario-gas'), {
  alElegir(fecha) {
    estado.fechaElegida = fecha;
    pintarTodo();
    navigator.vibrate?.(8);
  },
});

function pintarCalendarioEspana(serie, carburante, hoy) {
  const valores = new Map(serie.map((d) => [d.fecha, d.precio]));
  const niveles = nivelesPorTercios(valores);
  const elegida = valores.has(estado.fechaElegida) ? estado.fechaElegida : hoy.fecha;
  calendarioEspana.pintar({
    dias: new Map(serie.map((d) => [d.fecha, {
      nivel: niveles.get(d.fecha),
      texto: d.precio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      etiqueta: `${interfaz.precio(d.precio)} euros el litro`,
    }])),
    min: serie[0].fecha,
    max: hoy.fecha,
    hoy: hoy.fecha,
    elegido: elegida,
    leyenda: { izquierda: 'Más barata', derecha: 'Más cara' },
  });
}

// Tarjetas de carburante: cambian todo (también el mapa)
$('#carburantes').addEventListener('click', (evento) => {
  const boton = evento.target.closest('.carburante');
  if (!boton || !estado.datos) return;
  estado.carburante = boton.dataset.id;
  guardar();
  pintarTodo({ animar: true });
  if (estado.zona && estado.estaciones) pintarMapa();
  navigator.vibrate?.(8);
});

const barraLitros = $('#litros');
barraLitros.addEventListener('input', () => {
  estado.litros = Number(barraLitros.value);
  guardar();
  pintarLitros();
});
for (const chip of document.querySelectorAll('[data-litros]')) {
  chip.addEventListener('click', () => {
    estado.litros = Number(chip.dataset.litros);
    guardar();
    pintarLitros();
  });
}
for (const boton of document.querySelectorAll('[data-periodo]')) {
  boton.addEventListener('click', () => {
    estado.periodo = Number(boton.dataset.periodo);
    if (estado.datos) pintarTodo({ animar: true });
  });
}
$('#destacado').addEventListener('click', (evento) => {
  if (evento.target.closest('[data-accion="reintentar"]')) cargar();
  const extremo = evento.target.closest('.extremo');
  if (!extremo) return;
  estado.fechaElegida = extremo.dataset.fecha;
  pintarTodo();
  interfaz.irA('#calendario-gas');
});


/* ---------- ¡Arrancamos! ---------- */

aplicarAjustes();
const panel = iniciarPanel();

// La barra de la derecha para cambiar entre la luz y la gasolina
iniciarConmutador();

// Debajo de los carburantes, una mini línea para moverse si no caben todos
crearLineaDesplazamiento($('#carburantes'));

// Botón de ayuda: problemas, para qué sirve, fuentes y guía de uso
iniciarAyuda(datosAyudaGasolina({
  buscar: () => {
    interfaz.irA('.buscador', 'start');
    entrada.focus({ preventScroll: true });
  },
  cercaDeMi: () => cercaDeMi(),
  recargar: () => location.reload(),
  abrirSitios: () => {
    if (window.matchMedia('(min-width: 1280px)').matches) $('#sitios .sitios__entrada').focus();
    else {
      interfaz.irA('#bloque-mapa', 'start');
      sitios.abrir();
    }
  },
  cerrarPanel: () => panel.cerrar(),
}));

cargar();
if (estado.zona) {
  asegurarEstaciones().then((ok) => {
    if (!ok) return;
    if (estado.zona.tipo !== 'espana' || estado.marca) {
      entrada.value = estado.marca && estado.zona.tipo === 'espana' ? estado.estaciones.marcas.get(estado.marca)?.nombre ?? '' : estado.zona.nombre.replace(/^Provincia de /, '');
      $('#borrar-busqueda').hidden = !entrada.value;
      pintarMapa({ encuadrar: true });
    } else {
      estado.zona = null;
      pintarMapa();
    }
  });
} else {
  pintarMapa();
}

// Al girar el móvil, los gráficos se vuelven a dibujar con el nuevo ancho
let esperaTamano;
window.addEventListener('resize', () => {
  clearTimeout(esperaTamano);
  esperaTamano = setTimeout(() => {
    if (estado.datos) pintarTodo();
    if (estado.historial && estado.elegidaId) pintarHistorial({ animar: false });
    mapa.recolocar();
  }, 150);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../sw.js').catch(() => {});
}
