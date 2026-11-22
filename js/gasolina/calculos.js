/*
 * calculos.js (gasolina)
 * ------------------------------------------------------------------
 * Cuentas con los precios medios de cada día. No toca el HTML.
 *
 * Una «serie» es la lista de días de un carburante, del más antiguo al más nuevo:
 *   [{ fecha: '2026-11-22', precio: 1.550 }, …]   ← precio en €/litro
 */

const DIA = 24 * 60 * 60 * 1000;

// Si el precio de hoy está un 2 % por debajo de la media de los 6 meses,
// decimos que está «barata»; un 2 % por encima, «cara».
export const MARGEN = 0.02;

/** Saca la serie de un carburante del archivo de datos */
export function serieDe(datos, id) {
  const posicion = datos.carburantes.findIndex((carburante) => carburante.id === id);
  return Object.keys(datos.dias)
    .sort()
    .map((fecha) => ({ fecha, precio: datos.dias[fecha][posicion] }))
    .filter((dia) => typeof dia.precio === 'number');
}

const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / DIA);

/** Precio de hace `dias` días (o del día más cercano anterior con datos) */
export function precioHace(serie, dias) {
  const ultimo = serie[serie.length - 1];
  for (let i = serie.length - 1; i >= 0; i--) {
    if (diasEntre(serie[i].fecha, ultimo.fecha) >= dias) return serie[i];
  }
  return serie[0];
}

/** Media, mínimo y máximo de una serie */
export function resumen(serie) {
  let minimo = serie[0];
  let maximo = serie[0];
  let suma = 0;
  for (const dia of serie) {
    if (dia.precio < minimo.precio) minimo = dia;
    if (dia.precio > maximo.precio) maximo = dia;
    suma += dia.precio;
  }
  return { media: suma / serie.length, minimo, maximo };
}

/** 'barata', 'media' o 'cara' comparando con la media */
export function nivel(precio, media) {
  if (precio <= media * (1 - MARGEN)) return 'barata';
  if (precio >= media * (1 + MARGEN)) return 'cara';
  return 'media';
}

/**
 * Tendencia de las últimas semanas con una «regresión lineal»: la recta que
 * mejor pasa por los puntos. Su inclinación dice cuánto sube o baja cada día.
 * Devuelve { porDia, esperado } donde esperado es el precio previsto dentro
 * de `diasAdelante` días si la tendencia siguiera igual.
 */
export function tendencia(serie, { diasAtras = 28, diasAdelante = 7 } = {}) {
  const ultimo = serie[serie.length - 1];
  const tramo = serie.filter((dia) => diasEntre(dia.fecha, ultimo.fecha) <= diasAtras);
  const x = tramo.map((dia) => diasEntre(tramo[0].fecha, dia.fecha));
  const y = tramo.map((dia) => dia.precio);
  const mediaX = x.reduce((s, v) => s + v, 0) / x.length;
  const mediaY = y.reduce((s, v) => s + v, 0) / y.length;
  let arriba = 0;
  let abajo = 0;
  for (let i = 0; i < x.length; i++) {
    arriba += (x[i] - mediaX) * (y[i] - mediaY);
    abajo += (x[i] - mediaX) ** 2;
  }
  const porDia = abajo ? arriba / abajo : 0;
  const xFutura = x[x.length - 1] + diasAdelante;
  let esperado = mediaY + porDia * (xFutura - mediaX);
  // Por prudencia, no dejamos que la estimación se aleje más de un 5 % del precio de hoy
  esperado = Math.min(ultimo.precio * 1.05, Math.max(ultimo.precio * 0.95, esperado));
  return { porDia, esperado };
}

/** Lo que cuestan `litros` a un precio por litro */
export const coste = (litros, precio) => litros * precio;
