/*
 * electrodomesticos.js
 * ------------------------------------------------------------------
 * Lista de aparatos. Para cada uno:
 *   minutos: lo que suele durar (se puede cambiar en la app)
 *   kw:      potencia MEDIA aproximada mientras funciona, en kilovatios.
 *            Sirve para calcular el coste: kW × horas = kWh consumidos.
 *            Es una media: un horno de 2 kW no está siempre calentando.
 *   icono:   id del dibujo en iconos/iconos.svg
 *
 * ¡Añade los tuyos! Solo tienes que copiar una línea y cambiar los datos.
 */

export const ELECTRODOMESTICOS = [
  // Los seis que salen al principio en la pantalla principal
  { id: 'lavadora',     nombre: 'Lavadora',          minutos: 120, kw: 0.5,  icono: 'i-lavadora' },
  { id: 'lavavajillas', nombre: 'Lavavajillas',      minutos: 180, kw: 0.4,  icono: 'i-lavavajillas' },
  { id: 'secadora',     nombre: 'Secadora',          minutos: 90,  kw: 1.6,  icono: 'i-secadora' },
  { id: 'horno',        nombre: 'Horno',             minutos: 60,  kw: 1.2,  icono: 'i-horno' },
  { id: 'termo',        nombre: 'Termo',             minutos: 120, kw: 1.5,  icono: 'i-termo' },
  { id: 'coche',        nombre: 'Coche eléctrico',   minutos: 240, kw: 2.3,  icono: 'i-coche' },

  // Los de «Más»
  { id: 'freidora',     nombre: 'Freidora de aire',  minutos: 20,  kw: 1.4,  icono: 'i-freidora' },
  { id: 'microondas',   nombre: 'Microondas',        minutos: 5,   kw: 0.9,  icono: 'i-microondas' },
  { id: 'luces',        nombre: 'Luces de casa',     minutos: 240, kw: 0.06, icono: 'i-bombilla' },
  { id: 'plancha',      nombre: 'Plancha',           minutos: 60,  kw: 1.2,  icono: 'i-plancha' },
  { id: 'aspiradora',   nombre: 'Aspiradora',        minutos: 30,  kw: 0.8,  icono: 'i-aspiradora' },
  { id: 'placa',        nombre: 'Placa de cocina',   minutos: 45,  kw: 1.5,  icono: 'i-placa' },
  { id: 'hervidor',     nombre: 'Hervidor de agua',  minutos: 5,   kw: 2.0,  icono: 'i-hervidor' },
  { id: 'cafetera',     nombre: 'Cafetera',          minutos: 10,  kw: 1.0,  icono: 'i-cafetera' },
  { id: 'secador',      nombre: 'Secador de pelo',   minutos: 10,  kw: 1.8,  icono: 'i-secador' },
  { id: 'aire',         nombre: 'Aire acondicionado', minutos: 180, kw: 1.0, icono: 'i-aire' },
  { id: 'estufa',       nombre: 'Estufa eléctrica',  minutos: 120, kw: 2.0,  icono: 'i-estufa' },
  { id: 'tele',         nombre: 'Televisión',        minutos: 180, kw: 0.1,  icono: 'i-tele' },
  { id: 'ordenador',    nombre: 'Ordenador',         minutos: 240, kw: 0.15, icono: 'i-ordenador' },
  { id: 'consola',      nombre: 'Videoconsola',      minutos: 120, kw: 0.15, icono: 'i-consola' },
  { id: 'patinete',     nombre: 'Patinete eléctrico', minutos: 240, kw: 0.1, icono: 'i-patinete' },
  { id: 'movil',        nombre: 'Cargar el móvil',   minutos: 120, kw: 0.02, icono: 'i-movil' },
];

/** Los que están en la pantalla principal al empezar (el resto va a «Más») */
export const PRINCIPALES_INICIALES = ['lavadora', 'lavavajillas', 'secadora', 'horno', 'termo', 'coche'];

export const buscarElectro = (id) => ELECTRODOMESTICOS.find((electro) => electro.id === id);

/* ---------- Duración y potencia: de cuánto en cuánto cambian con − y + ---------- */

export const DURACION_MINIMA = 5;      // minutos
export const DURACION_MAXIMA = 10 * 60;

/** De 5 en 5 minutos hasta media hora, de 15 en 15 hasta 2 h y luego de 30 en 30 */
export function cambiarDuracion(minutos, sentido) {
  const referencia = sentido > 0 ? minutos : minutos - 1;
  const paso = referencia < 30 ? 5 : referencia < 120 ? 15 : 30;
  const nuevo = Math.round((minutos + sentido * paso) / paso) * paso;
  return Math.min(DURACION_MAXIMA, Math.max(DURACION_MINIMA, nuevo));
}

export const POTENCIA_MINIMA = 0.01;   // kW
export const POTENCIA_MAXIMA = 11;

/** De 0,01 en 0,01 kW hasta 0,1; de 0,05 hasta 1; de 0,1 hasta 3; y luego de 0,5 */
export function cambiarPotencia(kw, sentido) {
  const referencia = sentido > 0 ? kw + 1e-9 : kw - 1e-9;
  const paso = referencia < 0.1 ? 0.01 : referencia < 1 ? 0.05 : referencia < 3 ? 0.1 : 0.5;
  const nuevo = Math.round((kw + sentido * paso) / paso) * paso;
  return Math.round(Math.min(POTENCIA_MAXIMA, Math.max(POTENCIA_MINIMA, nuevo)) * 100) / 100;
}
