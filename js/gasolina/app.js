/*
 * app.js (gasolina) — el punto de entrada de la app de la gasolina
 * ------------------------------------------------------------------
 * Lee datos/gasolina.json (los precios medios de cada día, que actualiza
 * GitHub cada mañana con herramientas/actualizar-gasolina.mjs), hace las
 * cuentas con calculos.js y lo pinta con interfaz.js.
 */

import { serieDe, precioHace, resumen, nivel, tendencia } from './calculos.js';
import * as interfaz from './interfaz.js';
import { aplicarAjustes, iniciarPanel } from '../comun/ajustes.js';
import { crearCalendario, nivelesPorTercios } from '../comun/calendario.js';

const ARCHIVO = new URL('../../datos/gasolina.json', import.meta.url);
const CLAVE = 'cuando-lavadora:gasolina';

const estado = {
  datos: null,
  carburante: 'g95',
  litros: 40,
  periodo: 0,          // días del gráfico (0 = todos, unos 6 meses)
  fechaElegida: null,  // día elegido en el calendario
};

// Recordamos el carburante y los litros de la última vez
try {
  Object.assign(estado, JSON.parse(localStorage.getItem(CLAVE)) ?? {});
} catch {
  // nada guardado
}
const guardar = () => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ carburante: estado.carburante, litros: estado.litros }));
  } catch {
    // navegación privada
  }
};


/* ---------- Cargar los datos ---------- */

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


/* ---------- Pintar ---------- */

function pintarTodo({ animar = false } = {}) {
  const { datos } = estado;
  const carburante = datos.carburantes.find((c) => c.id === estado.carburante);
  const serie = serieDe(datos, carburante.id);
  const hoy = serie[serie.length - 1];
  const resumen6 = resumen(serie);

  // Cabecera: fecha de los datos y aviso si son viejos
  interfaz.pintarFecha(`Precio medio en España · ${interfaz.fechaCorta(hoy.fecha)}`);
  const dias = Math.round((Date.now() - new Date(`${hoy.fecha}T12:00:00Z`)) / 86400000);
  interfaz.pintarEstado(dias > 2 ? `Los datos son del ${interfaz.fechaLarga(hoy.fecha).toLowerCase()}: la actualización automática puede haber fallado.` : '');

  // 1. Tarjetas de los carburantes
  interfaz.pintarCarburantes(datos.carburantes.map((c) => {
    const s = serieDe(datos, c.id);
    const ultimo = s[s.length - 1];
    return {
      ...c,
      precio: ultimo.precio,
      semana: ultimo.precio - precioHace(s, 7).precio,
      puntos: s.slice(-30).map((d) => d.precio),
    };
  }), carburante.id);

  // 2. Precio de hoy del elegido
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

  // 3. Calculadora
  contexto = { serie, carburante, hoy, prevision };
  pintarLitros();

  // 4. Gráfico
  interfaz.marcarPeriodo(estado.periodo);
  interfaz.pintarLinea(estado.periodo ? serie.slice(-estado.periodo) : serie, { animar, fecha: estado.fechaElegida });

  // 5. Calendario
  pintarCalendario(serie, carburante, hoy);
}

// Lo último que se pintó: así, al mover los litros, solo se repinta lo que cambia
let contexto = null;

function pintarLitros() {
  if (!contexto) return;
  const { serie, carburante, hoy, prevision } = contexto;
  interfaz.pintarCalculadora({ litros: estado.litros, hoy, esperado: prevision.esperado, haceUnMes: precioHace(serie, 30) });
  const elegida = serie.find((d) => d.fecha === estado.fechaElegida) ?? hoy;
  interfaz.pintarDiaElegido({ carburante, dia: elegida, hoy, litros: estado.litros });
}

const calendario = crearCalendario(document.querySelector('#calendario-gas'), {
  alElegir(fecha) {
    estado.fechaElegida = fecha;
    pintarTodo();
    navigator.vibrate?.(8);
  },
});

function pintarCalendario(serie, carburante, hoy) {
  const valores = new Map(serie.map((d) => [d.fecha, d.precio]));
  const niveles = nivelesPorTercios(valores);
  const dias = new Map(serie.map((d) => [d.fecha, {
    nivel: niveles.get(d.fecha),
    texto: d.precio.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    etiqueta: `${interfaz.precio(d.precio)} euros el litro`,
  }]));
  const elegida = valores.has(estado.fechaElegida) ? estado.fechaElegida : hoy.fecha;
  calendario.pintar({
    dias,
    min: serie[0].fecha,
    max: hoy.fecha,
    hoy: hoy.fecha,
    elegido: elegida,
    leyenda: { izquierda: 'Más barata', derecha: 'Más cara' },
  });
  interfaz.pintarDiaElegido({
    carburante,
    dia: serie.find((d) => d.fecha === elegida),
    hoy,
    litros: estado.litros,
  });
}

/* ---------- Lo que hace la persona ---------- */


document.querySelector('#carburantes').addEventListener('click', (evento) => {
  const boton = evento.target.closest('.carburante');
  if (!boton || !estado.datos) return;
  estado.carburante = boton.dataset.id;
  guardar();
  pintarTodo({ animar: true });
  navigator.vibrate?.(8);
});

const barraLitros = document.querySelector('#litros');
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

// Mínimo y máximo: tocar uno lo enseña en el calendario
document.querySelector('#destacado').addEventListener('click', (evento) => {
  if (evento.target.closest('[data-accion="reintentar"]')) cargar();
  const extremo = evento.target.closest('.extremo');
  if (!extremo) return;
  estado.fechaElegida = extremo.dataset.fecha;
  pintarTodo();
  interfaz.irA('#calendario-gas');
});


/* ---------- ¡Arrancamos! ---------- */

aplicarAjustes();
iniciarPanel({
  atajo: {
    href: '../',
    clase: 'atajo--luz',
    icono: 'i-rayo',
    titulo: '¿Cuándo pongo la lavadora?',
    texto: 'Precio de la luz por horas',
  },
});
interfaz.iniciarGestosLinea();
cargar();

// Al girar el móvil, el gráfico se vuelve a dibujar con el nuevo ancho
let espera;
window.addEventListener('resize', () => {
  clearTimeout(espera);
  espera = setTimeout(() => estado.datos && pintarTodo(), 150);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('../sw.js').catch(() => {});
}
