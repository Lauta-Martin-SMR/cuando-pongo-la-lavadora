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


/* ---------- Gasolineras del mapa ---------- */

/**
 * Reparte los precios de una zona en 5 niveles del mismo tamaño (quintiles):
 * 1 = muy bajo (el 20 % más barato) … 5 = muy alto (el 20 % más caro).
 * Devuelve una función precio → nivel.
 */
export function nivelesQuintiles(precios) {
  const ordenados = precios.filter((p) => p > 0).sort((a, b) => a - b);
  if (!ordenados.length) return () => 3;
  const corte = (proporcion) => ordenados[Math.floor(proporcion * (ordenados.length - 1))];
  const cortes = [0.2, 0.4, 0.6, 0.8].map(corte);
  return (precio) => {
    for (let i = 0; i < cortes.length; i++) if (precio <= cortes[i]) return i + 1;
    return 5;
  };
}

/**
 * Gasolinera recomendada. items: [{ estacion, precio, km }]
 *  - Si sabemos dónde estás: la más barata a menos de 5 km (o de las 10 más cercanas).
 *  - Si no: la más barata de la zona.
 * Devuelve { item, motivo } o null.
 */
export function elegirRecomendada(items, conUbicacion) {
  if (!items.length) return null;
  const masBarata = (lista) => lista.reduce((mejor, item) => (
    item.precio < mejor.precio - 1e-9 || (Math.abs(item.precio - mejor.precio) < 1e-9 && (item.km ?? 0) < (mejor.km ?? 0)) ? item : mejor
  ));
  if (conUbicacion) {
    const cerca = items.filter((item) => item.km <= 5);
    if (cerca.length) return { item: masBarata(cerca), motivo: 'la más barata a menos de 5 km' };
    const cercanas = [...items].sort((a, b) => a.km - b.km).slice(0, 10);
    return { item: masBarata(cercanas), motivo: 'la más barata de las 10 más cercanas' };
  }
  return { item: masBarata(items), motivo: 'la más barata de la zona' };
}
