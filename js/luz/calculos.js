/*
 * calculos.js
 * ------------------------------------------------------------------
 * Las cuentas de la app. Este archivo no toca la página (el HTML):
 * recibe datos y devuelve resultados. Así es fácil de leer y de probar.
 *
 * En toda la app, una «hora» de precio es un objeto así:
 *   { inicio: Date, fin: Date, precio: 0.1234, periodo: 1 | 2 | 3 }
 * El precio (€/kWh) ya es el de la tarifa de la persona (lo calcula tarifas.js)
 * y el periodo es su tramo: 1 punta, 2 llano, 3 valle.
 */

// Los días de los precios son los de la península (como los publica Red Eléctrica).
export const ZONA_HORARIA = 'Europe/Madrid';

// Si una hora cuesta un 10 % menos que la media del día, es «barata»;
// si cuesta un 10 % más, es «cara». Cambia este número si quieres.
export const MARGEN = 0.10;

const MINUTO = 60 * 1000; // en milisegundos, que es como cuenta JavaScript
const CUARTO_DE_HORA = 15 * MINUTO;


/* ---------- Fechas en hora de España ---------- */

// Un «formateador» que nos dice año, mes, día y hora en Madrid.
// Se crea una sola vez porque crearlo es lento.
const formatoPartes = new Intl.DateTimeFormat('es-ES', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function partesEnEspana(momento) {
  const partes = {};
  for (const { type, value } of formatoPartes.formatToParts(momento)) {
    partes[type] = value;
  }
  return partes; // { year: '2026', month: '11', day: '22', hour: '18', … }
}

/** Fecha que es en España, como texto 'AAAA-MM-DD' (por ejemplo, '2026-11-22'). */
export function fechaEnEspana(momento = new Date()) {
  const { year, month, day } = partesEnEspana(momento);
  return `${year}-${month}-${day}`;
}

/** Hora que marca el reloj en España, de 0 a 23. */
export function horaEnEspana(momento = new Date()) {
  return Number(partesEnEspana(momento).hour);
}

/** Suma (o resta, con números negativos) días a una fecha 'AAAA-MM-DD'. */
export function sumarDias(fecha, dias) {
  // Usamos el mediodía en UTC para que el cambio de hora no nos descuadre.
  const dia = new Date(`${fecha}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}


/* ---------- Precios de un día ---------- */

/** Media del día y las horas más barata y más cara. */
export function resumenDelDia(horas) {
  let minima = horas[0];
  let maxima = horas[0];
  let suma = 0;
  for (const hora of horas) {
    if (hora.precio < minima.precio) minima = hora;
    if (hora.precio > maxima.precio) maxima = hora;
    suma += hora.precio;
  }
  return { media: suma / horas.length, minima, maxima };
}

/** 'barata', 'media' o 'cara', comparando el precio con la media del día. */
export function nivelDePrecio(precio, media) {
  // Math.abs: así también funciona si el mercado tiene precios negativos (tarifa indexada)
  const margen = Math.abs(media) * MARGEN;
  if (precio <= media - margen) return 'barata';
  if (precio >= media + margen) return 'cara';
  return 'media';
}

/** La hora de la lista que contiene el instante `momento` (o undefined). */
export function horaQueContiene(horas, momento) {
  const t = momento.getTime();
  return horas.find((hora) => hora.inicio.getTime() <= t && t < hora.fin.getTime());
}

/** Las `cuantas` horas más baratas que todavía no han terminado (la actual cuenta). */
export function horasMasBaratas(horas, desde, cuantas = 3) {
  return horas
    .filter((hora) => hora.fin.getTime() > desde.getTime())
    .sort((a, b) => a.precio - b.precio) // de más barata a más cara
    .slice(0, cuantas);
}


/* ---------- La franja seguida más barata ---------- */

/**
 * Busca cuándo empezar un programa de `minutos` de duración para que salga lo más barato posible.
 *   - horas:   los precios que conocemos (hoy, y mañana si ya se ha publicado)
 *   - minutos: lo que dura el programa (5 minutos, 2 horas…)
 *   - desde:   no se puede empezar antes de este momento (normalmente, ahora)
 *
 * Devuelve { mejor, empezandoYa } o null si no cabe ninguna franja.
 * Cada franja es { inicio: Date, fin: Date, precioMedio: €/kWh }.
 *
 * Cómo lo hace: parte el tiempo en tramos de 15 minutos, prueba todas
 * las horas de inicio posibles, calcula el precio medio de cada franja
 * y se queda con la más barata.
 */
export function buscarMejorFranja(horas, minutos, desde) {
  // 1. Cada hora se convierte en 4 tramos de 15 minutos con el mismo precio.
  const tramos = [];
  for (const hora of horas) {
    for (let t = hora.inicio.getTime(); t < hora.fin.getTime(); t += CUARTO_DE_HORA) {
      tramos.push({ inicio: t, precio: hora.precio });
    }
  }

  // Por ejemplo, 2 h = 8 tramos; 20 minutos = 2 tramos (el último solo se usa 5 minutos)
  const necesarios = Math.ceil(minutos / 15);
  const minutosUltimo = minutos - (necesarios - 1) * 15;
  let mejor = null;
  let empezandoYa = null;

  // 2. Probamos cada tramo como posible inicio.
  for (let i = 0; i + necesarios <= tramos.length; i++) {
    const primero = tramos[i];
    const ultimo = tramos[i + necesarios - 1];

    // Si el tramo ya ha terminado, ya no se puede empezar ahí.
    if (primero.inicio + CUARTO_DE_HORA <= desde.getTime()) continue;

    // Los tramos tienen que ir seguidos (sin huecos sin precio entre medias).
    if (ultimo.inicio - primero.inicio !== (necesarios - 1) * CUARTO_DE_HORA) continue;

    // Media ponderada por los minutos que se usa cada tramo
    let suma = 0;
    for (let j = 0; j < necesarios; j++) {
      suma += tramos[i + j].precio * (j === necesarios - 1 ? minutosUltimo : 15);
    }

    const franja = {
      inicio: new Date(primero.inicio),
      fin: new Date(primero.inicio + minutos * MINUTO),
      precioMedio: suma / minutos,
    };

    // La primera franja posible es la de «empezar ahora mismo».
    if (!empezandoYa) empezandoYa = franja;

    // Nos quedamos con la más barata (si empatan, con la que empieza antes).
    if (!mejor || franja.precioMedio < mejor.precioMedio - 1e-9) mejor = franja;
  }

  return mejor ? { mejor, empezandoYa } : null;
}


/* ---------- Energía de un aparato ---------- */

/** kWh que gasta un aparato de `kw` kilovatios durante `minutos` (el precio lo pone tarifas.js) */
export const kWhDe = (kw, minutos) => kw * (minutos / 60);

/** Las próximas `cuantas` horas a partir de la actual (puede incluir las de mañana) */
export function proximasHoras(horas, ahora, cuantas = 6) {
  return horas.filter((hora) => hora.fin.getTime() > ahora.getTime()).slice(0, cuantas);
}
