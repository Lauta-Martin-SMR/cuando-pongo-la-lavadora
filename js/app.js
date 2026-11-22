/*
 * app.js — el punto de entrada
 * ------------------------------------------------------------------
 * Guarda el estado de la app, consigue los precios (api.js), hace las
 * cuentas (calculos.js) y le pide a interfaz.js que lo pinte todo.
 *
 * Flujo:
 *   1. Al abrir: pinta los botones y carga los precios de hoy
 *      (y los de mañana si ya son más de las 20:00).
 *   2. Cada 20 segundos mira si ha pasado algo: otro cuarto de hora
 *      (repinta), medianoche (carga el día nuevo) o si ya están los
 *      precios de mañana.
 */

import { preciosDelDia } from './api.js';
import {
  fechaEnEspana,
  horaEnEspana,
  sumarDias,
  resumenDelDia,
  nivelDePrecio,
  horaQueContiene,
  horasMasBaratas,
  buscarMejorFranja,
} from './calculos.js';
import * as interfaz from './interfaz.js';


/* ---------- Ajustes (cámbialos a tu gusto) ---------- */

// Electrodomésticos y lo que suele durar un programa, en minutos.
// El icono es el id de un <symbol> de index.html.
const ELECTRODOMESTICOS = [
  { id: 'lavadora',     nombre: 'Lavadora',        minutos: 120, icono: 'i-lavadora' },
  { id: 'lavavajillas', nombre: 'Lavavajillas',    minutos: 180, icono: 'i-lavavajillas' },
  { id: 'secadora',     nombre: 'Secadora',        minutos: 90,  icono: 'i-secadora' },
  { id: 'horno',        nombre: 'Horno',           minutos: 60,  icono: 'i-horno' },
  { id: 'termo',        nombre: 'Termo',           minutos: 120, icono: 'i-termo' },
  { id: 'coche',        nombre: 'Coche eléctrico', minutos: 240, icono: 'i-coche' },
];

const DURACION_MINIMA = 30;           // minutos
const DURACION_MAXIMA = 8 * 60;
const HORA_PRECIOS_MANANA = 20;       // REE publica los de mañana hacia las 20:30
const REINTENTAR_MANANA = 10 * 60 * 1000;   // si aún no están, volvemos a mirar cada 10 min
const REINTENTAR_SI_FALLA = 5 * 60 * 1000;  // si no hay precios de hoy, reintento automático
const CUARTO_DE_HORA = 15 * 60 * 1000;
const CLAVE_PREFERENCIAS = 'cuando-lavadora:preferencias';


/* ---------- Estado de la app ---------- */

const estado = {
  hoy: null,           // { fecha: 'AAAA-MM-DD', horas: [...] }
  manana: null,        // igual que hoy, o null si REE aún no lo ha publicado
  cargando: false,
  error: null,         // mensaje si no tenemos los precios de hoy
  sinConexion: false,  // true si ha fallado la última conexión con REE
  diaGrafico: 'hoy',   // qué día enseña el gráfico: 'hoy' o 'manana'
  electro: ELECTRODOMESTICOS[0],
  minutos: ELECTRODOMESTICOS[0].minutos,
  ultimoIntento: 0,        // cuándo intentamos cargar por última vez
  ultimoIntentoManana: 0,  // cuándo buscamos por última vez los precios de mañana
  cuartoPintado: null,     // cuarto de hora del último repintado
};


/* ---------- Cargar los precios ---------- */

async function cargar() {
  if (estado.cargando) return;
  estado.cargando = true;
  estado.ultimoIntento = Date.now();

  const fechaHoy = fechaEnEspana();
  if (estado.hoy?.fecha !== fechaHoy) {
    // Día nuevo (o primera carga): lo de ayer ya no vale
    estado.hoy = null;
    estado.manana = null;
    estado.diaGrafico = 'hoy';
  }

  try {
    const horas = await preciosDelDia(fechaHoy);
    if (horas) {
      estado.hoy = { fecha: fechaHoy, horas };
      estado.error = null;
      estado.sinConexion = false;
    } else {
      estado.error = 'Red Eléctrica no está dando los precios de hoy en este momento. Prueba otra vez en unos minutos.';
    }
  } catch {
    estado.sinConexion = true;
    estado.error = 'No hay conexión con Red Eléctrica. Revisa tu conexión a internet y vuelve a intentarlo.';
  }

  await buscarManana();
  estado.cargando = false;
  pintar({ animar: true });
}

/** Busca los precios de mañana, pero solo a partir de las 20:00 (antes nunca están). */
async function buscarManana() {
  if (!estado.hoy || estado.manana || horaEnEspana() < HORA_PRECIOS_MANANA) return;
  estado.ultimoIntentoManana = Date.now();
  const fechaManana = sumarDias(estado.hoy.fecha, 1);
  try {
    const horas = await preciosDelDia(fechaManana);
    estado.manana = horas ? { fecha: fechaManana, horas } : null;
    estado.sinConexion = false;
  } catch {
    estado.sinConexion = true; // lo volveremos a intentar en unos minutos
  }
}


/* ---------- Pintar la pantalla ---------- */

function pintar({ animar = false, anunciar = false } = {}) {
  const ahora = new Date();
  estado.cuartoPintado = Math.floor(ahora.getTime() / CUARTO_DE_HORA);
  interfaz.pintarFecha(ahora);

  if (estado.cargando && !estado.hoy) return; // siguen las formas grises de carga
  if (!estado.hoy) {
    interfaz.pintarError(estado.error);
    interfaz.pintarEstado('');
    return;
  }

  const horasHoy = estado.hoy.horas;
  const resumenHoy = resumenDelDia(horasHoy);
  const nivelHoy = (precio) => nivelDePrecio(precio, resumenHoy.media);

  // 1. Precio de ahora
  const actual = horaQueContiene(horasHoy, ahora) ?? horasHoy[horasHoy.length - 1];
  interfaz.pintarAhora({ hora: actual, nivel: nivelHoy(actual.precio), media: resumenHoy.media });

  // 2. Las 3 horas más baratas que quedan hoy
  interfaz.pintarBaratas({
    horas: horasMasBaratas(horasHoy, ahora, 3),
    ahora,
    nivelDe: nivelHoy,
    hayManana: Boolean(estado.manana),
  });

  // 3. La franja seguida más barata para el electrodoméstico, con todo lo
  //    que sabemos a partir de ahora (hoy y, si ya está publicado, mañana)
  const horasConocidas = estado.manana ? horasHoy.concat(estado.manana.horas) : horasHoy;
  const franja = buscarMejorFranja(horasConocidas, estado.minutos, ahora);
  const resumenTexto = interfaz.pintarResultado({
    electro: estado.electro,
    minutos: estado.minutos,
    minimo: DURACION_MINIMA,
    maximo: DURACION_MAXIMA,
    franja,
    ahora,
    fechaHoy: estado.hoy.fecha,
  });
  if (anunciar) interfaz.anunciar(resumenTexto);

  // 4. Gráfico del día elegido
  interfaz.pintarPestanas(estado.diaGrafico);
  const dia = estado.diaGrafico === 'manana' ? estado.manana : estado.hoy;
  if (dia) {
    const resumen = dia === estado.hoy ? resumenHoy : resumenDelDia(dia.horas);
    interfaz.pintarGrafico({
      horas: dia.horas,
      resumen,
      nivelDe: (precio) => nivelDePrecio(precio, resumen.media),
      ahora,
      esHoy: dia === estado.hoy,
      franja: franja?.mejor ?? null,
      electro: estado.electro,
      animar,
    });
  } else {
    interfaz.pintarSinManana(textoSinManana(ahora));
  }

  interfaz.pintarEstado(estado.sinConexion ? 'Sin conexión con Red Eléctrica: usando los precios guardados.' : '');
}

function textoSinManana(ahora) {
  if (estado.sinConexion) return 'No hemos podido conectar con Red Eléctrica. Lo volveremos a intentar en unos minutos.';
  if (horaEnEspana(ahora) < HORA_PRECIOS_MANANA) return 'Red Eléctrica los publica cada tarde, hacia las 20:30.';
  return 'Red Eléctrica aún no los ha publicado. La app vuelve a mirar cada 10 minutos.';
}


/* ---------- Lo que hace la persona ---------- */

const acciones = {
  alElegirElectro(id) {
    estado.electro = ELECTRODOMESTICOS.find((electro) => electro.id === id) ?? ELECTRODOMESTICOS[0];
    estado.minutos = estado.electro.minutos;
    interfaz.marcarElectro(estado.electro.id);
    guardarPreferencias();
    pintar({ anunciar: true });
  },

  alCambiarDuracion(cambio) {
    estado.minutos = Math.min(DURACION_MAXIMA, Math.max(DURACION_MINIMA, estado.minutos + cambio));
    guardarPreferencias();
    pintar({ anunciar: true });
  },

  alCambiarDia(dia) {
    if (dia === estado.diaGrafico) return;
    estado.diaGrafico = dia;
    pintar({ animar: true });
  },

  alReintentar() {
    cargar();
  },

  async alInstalar() {
    if (!avisoInstalacion) return;
    avisoInstalacion.prompt();          // abre el diálogo de instalación del navegador
    await avisoInstalacion.userChoice;  // esperamos a que acepte o cancele
    avisoInstalacion = null;
    interfaz.mostrarInstalar(null);
  },
};


/* ---------- Recordar el electrodoméstico elegido ---------- */

function guardarPreferencias() {
  try {
    localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify({ electro: estado.electro.id, minutos: estado.minutos }));
  } catch {
    // Navegación privada: no pasa nada
  }
}

function leerPreferencias() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS));
    const electro = ELECTRODOMESTICOS.find((e) => e.id === guardado?.electro);
    if (!electro) return;
    estado.electro = electro;
    const minutos = Number(guardado.minutos);
    estado.minutos = minutos >= DURACION_MINIMA && minutos <= DURACION_MAXIMA ? minutos : electro.minutos;
  } catch {
    // Nada guardado todavía
  }
}


/* ---------- Vigilar el paso del tiempo ---------- */

function vigilar() {
  if (estado.cargando) return;
  const ahora = new Date();

  // ¿Ha pasado la medianoche? → cargamos el día nuevo
  if (estado.hoy && fechaEnEspana(ahora) !== estado.hoy.fecha) {
    cargar();
    return;
  }

  // ¿No tenemos los precios de hoy? → reintentamos de vez en cuando
  if (!estado.hoy) {
    if (Date.now() - estado.ultimoIntento > REINTENTAR_SI_FALLA) cargar();
    return;
  }

  // ¿Ya son más de las 20:00 y aún no tenemos los de mañana? → miramos cada 10 minutos
  const tocaBuscarManana = !estado.manana
    && horaEnEspana(ahora) >= HORA_PRECIOS_MANANA
    && Date.now() - estado.ultimoIntentoManana > REINTENTAR_MANANA;
  if (tocaBuscarManana) {
    estado.cargando = true;
    buscarManana().finally(() => {
      estado.cargando = false;
      pintar();
    });
    return;
  }

  // ¿Ha empezado otro cuarto de hora? → repintamos para mover «ahora»
  if (Math.floor(ahora.getTime() / CUARTO_DE_HORA) !== estado.cuartoPintado) pintar();
}


/* ---------- PWA: service worker e instalación ---------- */

let avisoInstalacion = null;

function prepararInstalacion() {
  const yaInstalada = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (yaInstalada) return;

  // Chrome, Edge y Samsung Internet avisan cuando la app se puede instalar
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault(); // en lugar del aviso del navegador, enseñamos nuestro botón
    avisoInstalacion = evento;
    interfaz.mostrarInstalar('boton');
  });

  window.addEventListener('appinstalled', () => {
    avisoInstalacion = null;
    interfaz.mostrarInstalar(null);
  });

  // Safari en iPhone/iPad no avisa: explicamos cómo hacerlo a mano.
  // (Aquí sí hay que mirar el navegador: no existe otra forma de saberlo.)
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (esIOS) interfaz.mostrarInstalar('ios');
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('No se pudo registrar el service worker:', error);
  });
}


/* ---------- ¡Arrancamos! ---------- */

leerPreferencias();
interfaz.pintarElectros(ELECTRODOMESTICOS);
interfaz.marcarElectro(estado.electro.id);
interfaz.iniciar(acciones);
interfaz.pintarFecha(new Date());

cargar();
setInterval(vigilar, 20 * 1000);

// El móvil congela las páginas en segundo plano: al volver, comprobamos enseguida
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') vigilar();
});
window.addEventListener('online', () => {
  estado.ultimoIntento = 0;
  estado.ultimoIntentoManana = 0;
  vigilar();
});

registrarServiceWorker();
prepararInstalacion();
