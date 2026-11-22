/*
 * app.js — el punto de entrada de la app de la luz
 * ------------------------------------------------------------------
 * Guarda el estado de la app, consigue los precios (api.js), hace las
 * cuentas (calculos.js) y le pide a interfaz.js que lo pinte todo.
 *
 * Flujo:
 *   1. Al abrir: aplica los ajustes (tema, letra), coloca las tarjetas como
 *      las dejaste y carga los precios de hoy (y los de mañana si ya son
 *      más de las 20:00).
 *   2. Cada 20 segundos mira si ha pasado algo: otro cuarto de hora
 *      (repinta), medianoche (carga el día nuevo) o si ya están los
 *      precios de mañana.
 */

import { preciosDelDia, historial } from './api.js';
import {
  fechaEnEspana,
  horaEnEspana,
  sumarDias,
  resumenDelDia,
  nivelDePrecio,
  horaQueContiene,
  horasMasBaratas,
  buscarMejorFranja,
  costeAproximado,
  proximasHoras,
} from './calculos.js';
import {
  ELECTRODOMESTICOS,
  buscarElectro,
  cambiarDuracion,
  cambiarPotencia,
  DURACION_MINIMA,
  DURACION_MAXIMA,
  POTENCIA_MINIMA,
  POTENCIA_MAXIMA,
} from './electrodomesticos.js';
import * as interfaz from './interfaz.js';
import {
  leerDiseno,
  guardarDiseno,
  borrarDiseno,
  disenoInicial,
  ordenarSecciones,
  iniciarPersonalizar,
} from './personalizar.js';
import { aplicarAjustes, iniciarPanel, restaurarAjustes } from '../comun/ajustes.js';
import { crearCalendario, mensajeCalendario, nivelesPorTercios } from '../comun/calendario.js';


/* ---------- Ajustes ---------- */

const HORA_PRECIOS_MANANA = 20;             // REE publica los de mañana hacia las 20:30
const REINTENTAR_MANANA = 10 * 60 * 1000;   // si aún no están, volvemos a mirar cada 10 min
const REINTENTAR_SI_FALLA = 5 * 60 * 1000;  // si no hay precios de hoy, reintento automático
const CUARTO_DE_HORA = 15 * 60 * 1000;
const DIAS_CALENDARIO = 60;                 // el calendario enseña los dos últimos meses
const CLAVE_PREFERENCIAS = 'cuando-lavadora:preferencias';
const LIMITES = { duracion: [DURACION_MINIMA, DURACION_MAXIMA], potencia: [POTENCIA_MINIMA, POTENCIA_MAXIMA] };


/* ---------- Estado de la app ---------- */

const estado = {
  hoy: null,               // { fecha: 'AAAA-MM-DD', horas: [...] }
  manana: null,            // igual que hoy, o null si REE aún no lo ha publicado
  cargando: false,
  error: null,             // mensaje si no tenemos los precios de hoy
  sinConexion: false,      // true si ha fallado la última conexión con REE
  diaGrafico: 'hoy',       // qué enseña el gráfico: 'hoy', 'manana' o 'calendario'
  fechaCalendario: null,   // día elegido en el calendario ('AAAA-MM-DD')
  historial: null,         // Map fecha → horas de los dos últimos meses
  cargandoHistorial: false,
  electroId: 'lavadora',   // aparato elegido
  personal: {},            // duración y potencia que ha cambiado la persona: { lavadora: { minutos, kw } }
  diseno: leerDiseno(),    // orden de las tarjetas y qué aparatos van en «Más»
  masAntesDeEditar: false,
  ultimoIntento: 0,
  ultimoIntentoManana: 0,
  cuartoPintado: null,
};

const electroActual = () => buscarElectro(estado.electroId) ?? ELECTRODOMESTICOS[0];
const minutosDe = (id) => estado.personal[id]?.minutos ?? buscarElectro(id).minutos;
const kwDe = (id) => estado.personal[id]?.kw ?? buscarElectro(id).kw;


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
    estado.historial = null;
    estado.diaGrafico = 'hoy';
    estado.fechaCalendario = null;
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

/**
 * animar: las barras del gráfico crecen (al cambiar de día)
 * cambioDelUsuario: el resultado aparece con un pequeño efecto y se anuncia
 */
function pintar({ animar = false, cambioDelUsuario = false } = {}) {
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
  const horasConocidas = estado.manana ? horasHoy.concat(estado.manana.horas) : horasHoy;

  // 1. Precio de ahora (y las próximas horas, por si se despliegan)
  const actual = horaQueContiene(horasHoy, ahora) ?? horasHoy[horasHoy.length - 1];
  interfaz.pintarAhora({
    hora: actual,
    nivel: nivelHoy(actual.precio),
    media: resumenHoy.media,
    proximas: proximasHoras(horasConocidas, ahora, 6),
    nivelDe: nivelHoy,
  });

  // 2. Las 3 horas más baratas que quedan hoy
  interfaz.pintarBaratas({
    horas: horasMasBaratas(horasHoy, ahora, 3),
    ahora,
    nivelDe: nivelHoy,
    hayManana: Boolean(estado.manana),
  });

  // 3. La franja más barata para el aparato y lo que costaría
  const electro = electroActual();
  const minutos = minutosDe(electro.id);
  const kw = kwDe(electro.id);
  const franja = buscarMejorFranja(horasConocidas, minutos, ahora);
  const coste = franja && {
    mejor: costeAproximado(kw, minutos, franja.mejor.precioMedio),
    empezandoYa: costeAproximado(kw, minutos, franja.empezandoYa.precioMedio),
  };
  const resumenTexto = interfaz.pintarResultado({
    electro, minutos, kw, franja, coste, ahora,
    fechaHoy: estado.hoy.fecha,
    limites: LIMITES,
    animar: cambioDelUsuario,
  });
  if (cambioDelUsuario) interfaz.anunciar(resumenTexto);

  // 4. Gráfico del día elegido (hoy, mañana o un día del calendario)
  pintarGrafico(ahora, resumenHoy, franja, animar);

  interfaz.pintarEstado(estado.sinConexion ? 'Sin conexión con Red Eléctrica: usando los precios guardados.' : '');
}

const formatoCorto = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function pintarGrafico(ahora, resumenHoy, franja, animar) {
  let dia = null;
  let titulo = null;
  let textoPestana = '';

  if (estado.diaGrafico === 'manana') {
    dia = estado.manana;
  } else if (estado.diaGrafico === 'calendario') {
    const fecha = estado.fechaCalendario ?? estado.hoy.fecha;
    if (fecha === estado.hoy.fecha) dia = estado.hoy;
    else if (fecha === estado.manana?.fecha) dia = estado.manana;
    else if (estado.historial?.has(fecha)) dia = { fecha, horas: estado.historial.get(fecha) };
    if (dia && dia !== estado.hoy) {
      titulo = interfaz.tituloDia(fecha);
      textoPestana = formatoCorto.format(new Date(`${fecha}T12:00:00Z`)).replace('.', ''); // «15 oct»
    }
    pintarCalendario();
  } else {
    dia = estado.hoy;
  }

  interfaz.pintarPestanas(estado.diaGrafico, textoPestana);

  if (!dia) {
    if (estado.diaGrafico === 'manana') interfaz.pintarSinManana(textoSinManana(ahora));
    return;
  }

  const esHoy = dia === estado.hoy;
  const resumen = esHoy ? resumenHoy : resumenDelDia(dia.horas);
  interfaz.pintarGrafico({
    horas: dia.horas,
    resumen,
    nivelDe: (precio) => nivelDePrecio(precio, resumen.media),
    ahora,
    esHoy,
    franja: franja?.mejor ?? null,
    electro: electroActual(),
    titulo,
    animar,
  });
}

function textoSinManana(ahora) {
  if (estado.sinConexion) return 'No hemos podido conectar con Red Eléctrica. Lo volveremos a intentar en unos minutos.';
  if (horaEnEspana(ahora) < HORA_PRECIOS_MANANA) return 'Red Eléctrica los publica cada tarde, hacia las 20:30.';
  return 'Red Eléctrica aún no los ha publicado. La app vuelve a mirar cada 10 minutos.';
}


/* ---------- Calendario de los dos últimos meses ---------- */

const cajaCalendario = document.querySelector('#calendario-luz');
const calendario = crearCalendario(cajaCalendario, {
  alElegir(fecha) {
    estado.fechaCalendario = fecha;
    pintar({ animar: true });
    navigator.vibrate?.(8);
  },
});

cajaCalendario.addEventListener('click', (evento) => {
  if (evento.target.closest('[data-reintentar-historial]')) cargarHistorial();
});

/** Descarga (una vez) los precios de los dos últimos meses */
async function cargarHistorial() {
  if (estado.historial || estado.cargandoHistorial || !estado.hoy) return;
  estado.cargandoHistorial = true;
  mensajeCalendario(cajaCalendario, 'Cargando los precios de los dos últimos meses…');
  try {
    estado.historial = await historial(sumarDias(estado.hoy.fecha, -DIAS_CALENDARIO), sumarDias(estado.hoy.fecha, -1));
  } catch {
    estado.historial = null;
  }
  estado.cargandoHistorial = false;
  if (!estado.historial?.size) {
    estado.historial = null;
    mensajeCalendario(cajaCalendario, `No hemos podido cargar los días anteriores.<br>
      <button type="button" class="boton boton--suave" data-reintentar-historial style="margin-top:12px">Reintentar</button>`);
    return;
  }
  pintar();
}

function pintarCalendario() {
  if (estado.cargandoHistorial) return;
  if (!estado.historial) {
    cargarHistorial();
    return;
  }
  const dias = new Map(estado.historial);
  dias.set(estado.hoy.fecha, estado.hoy.horas);
  if (estado.manana) dias.set(estado.manana.fecha, estado.manana.horas);

  // Media de cada día y su color comparado con los demás días (por tercios)
  const medias = new Map([...dias].map(([fecha, horas]) => [fecha, resumenDelDia(horas).media]));
  const niveles = nivelesPorTercios(medias);
  const info = new Map([...medias].map(([fecha, media]) => [fecha, {
    nivel: niveles.get(fecha),
    texto: media.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    etiqueta: `${interfaz.precio(media)} euros el kilovatio hora de media`,
  }]));

  calendario.pintar({
    dias: info,
    min: sumarDias(estado.hoy.fecha, -DIAS_CALENDARIO),
    max: estado.manana?.fecha ?? estado.hoy.fecha,
    hoy: estado.hoy.fecha,
    elegido: estado.fechaCalendario ?? estado.hoy.fecha,
    leyenda: { izquierda: 'Más barato', derecha: 'Más caro' },
  });
}


/* ---------- Lo que hace la persona ---------- */

const acciones = {
  alElegirElectro(id, desdeMas) {
    estado.electroId = id;
    interfaz.marcarElectro(id);
    guardarPreferencias();
    pintar({ cambioDelUsuario: true });
    navigator.vibrate?.(8);
    if (desdeMas) interfaz.verResultado();
  },

  alCambiarDuracion(sentido) {
    const id = estado.electroId;
    estado.personal[id] = { ...estado.personal[id], minutos: cambiarDuracion(minutosDe(id), sentido) };
    guardarPreferencias();
    pintarAparatos();
    pintar({ cambioDelUsuario: true });
  },

  alCambiarPotencia(sentido) {
    const id = estado.electroId;
    estado.personal[id] = { ...estado.personal[id], kw: cambiarPotencia(kwDe(id), sentido) };
    guardarPreferencias();
    pintar({ cambioDelUsuario: true });
  },

  alCambiarDia(dia) {
    if (dia === estado.diaGrafico) return;
    estado.diaGrafico = dia;
    pintar({ animar: true });
  },

  alVerHora(instante) {
    if (estado.diaGrafico !== 'hoy') {
      estado.diaGrafico = 'hoy';
      pintar({ animar: true });
    }
    interfaz.elegirHora(instante);
    interfaz.irAlGrafico();
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

function pintarAparatos() {
  const conDuracion = (id) => ({ ...buscarElectro(id), minutos: minutosDe(id) });
  interfaz.pintarElectros({
    principales: estado.diseno.principales.map(conDuracion),
    mas: estado.diseno.mas.map(conDuracion),
    elegido: estado.electroId,
  });
  personalizar?.refrescarTemblor();
}


/* ---------- Personalizar y restaurar ---------- */

const panel = iniciarPanel({
  personalizar: {
    alPulsar: () => personalizar.alternar(),
    alRestaurar: () => pedirRestaurar(),
  },
  atajo: {
    href: 'gasolina/',
    icono: 'i-surtidor',
    titulo: '¿Cuándo echo gasolina?',
    texto: 'Precio de la gasolina y el diésel hoy',
  },
});

const personalizar = iniciarPersonalizar({
  obtenerDiseno: () => structuredClone(estado.diseno),
  alCambiarDiseno(diseno, repintarAparatos) {
    estado.diseno = diseno;
    guardarDiseno(diseno);
    if (repintarAparatos) pintarAparatos();
  },
  alCambiarModo(editando) {
    panel.marcarEdicion(editando);
    if (editando) {
      // Abrimos «Más» para poder mover aparatos entre las dos zonas
      estado.masAntesDeEditar = interfaz.masAbierto();
      interfaz.abrirMas(true);
    } else {
      interfaz.abrirMas(estado.masAntesDeEditar);
      interfaz.anunciar('Cambios guardados');
    }
  },
  alRestaurar: () => pedirRestaurar(),
});

function pedirRestaurar() {
  const dialogo = document.querySelector('#dialogo-restaurar');
  dialogo.returnValue = '';
  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'restaurar') restaurarTodo();
  }, { once: true });
  dialogo.showModal();
}

function restaurarTodo() {
  borrarDiseno();
  estado.diseno = disenoInicial();
  estado.personal = {};
  estado.electroId = 'lavadora';
  guardarPreferencias();
  restaurarAjustes();
  ordenarSecciones(estado.diseno.secciones);
  pintarAparatos();
  estado.masAntesDeEditar = false;
  personalizar.salir();
  interfaz.abrirMas(false);
  pintar({ animar: true });
  interfaz.anunciar('Todo ha vuelto a estar como al principio');
}


/* ---------- Recordar el aparato elegido y los cambios de tiempo y potencia ---------- */

function guardarPreferencias() {
  try {
    localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify({ electro: estado.electroId, personal: estado.personal }));
  } catch {
    // Navegación privada: no pasa nada
  }
}

function leerPreferencias() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS));
    if (buscarElectro(guardado?.electro)) estado.electroId = guardado.electro;
    for (const [id, valores] of Object.entries(guardado?.personal ?? {})) {
      if (!buscarElectro(id)) continue;
      const minutos = Number(valores.minutos);
      const kw = Number(valores.kw);
      estado.personal[id] = {
        ...(minutos >= DURACION_MINIMA && minutos <= DURACION_MAXIMA ? { minutos } : {}),
        ...(kw >= POTENCIA_MINIMA && kw <= POTENCIA_MAXIMA ? { kw } : {}),
      };
    }
  } catch {
    // Nada guardado todavía
  }
}


/* ---------- El precio de la gasolina en el acceso directo del panel ---------- */

async function precioGasolinaEnAtajo() {
  try {
    const respuesta = await fetch('datos/gasolina.json');
    const datos = await respuesta.json();
    const fechas = Object.keys(datos.dias).sort();
    const ultimo = datos.dias[fechas[fechas.length - 1]];
    const g95 = ultimo[datos.carburantes.findIndex((c) => c.id === 'g95')];
    if (g95) panel.ponerTextoAtajo(`Gasolina 95: ${g95.toLocaleString('es-ES', { minimumFractionDigits: 3 })} €/l de media`);
  } catch {
    // Sin conexión: se queda el texto de siempre
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

aplicarAjustes();
leerPreferencias();
ordenarSecciones(estado.diseno.secciones);
pintarAparatos();
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
precioGasolinaEnAtajo();
