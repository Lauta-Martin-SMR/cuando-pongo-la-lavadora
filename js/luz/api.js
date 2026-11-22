/*
 * api.js
 * ------------------------------------------------------------------
 * Consigue los precios PVPC de un día:
 *   1. Si ya los descargamos antes, los lee de la copia guardada en el
 *      navegador (localStorage).
 *   2. Si no, los pide a la API pública de Red Eléctrica (REE).
 *
 * Los precios de un día no cambian una vez publicados, así que guardarlos
 * es seguro: la app abre al instante y funciona aunque no haya conexión.
 *
 * Endpoint (comprobado en noviembre de 2026):
 *   https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real
 *     ?start_date=2026-11-22T00:00&end_date=2026-11-22T23:59&time_trunc=hour
 *
 * La respuesta trae varios indicadores en `included`. El PVPC es el de
 * id "1001": 24 valores (23 o 25 los días de cambio de hora) en €/MWh.
 * Si el día aún no está publicado, REE responde con un error 502.
 */

import { sumarDias, fechaEnEspana } from './calculos.js';

const URL_REE = 'https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real';
const ID_PVPC = '1001';
const HORA = 60 * 60 * 1000;
const MAXIMO_DIAS_POR_PETICION = 31; // REE no da más de un mes por horas de una vez

// Las copias se guardan como «cuando-lavadora:2026-11-22».
// (En GitHub Pages todas tus webs comparten localStorage: el prefijo evita mezclas.)
const PREFIJO = 'cuando-lavadora:';
const VERSION_COPIA = 1;
const DIAS_GUARDADOS = 70; // un poco más de los dos meses del calendario


/**
 * Devuelve las horas de un día ('AAAA-MM-DD') así: [{ inicio, fin, precio }, …]
 * o null si Red Eléctrica todavía no lo ha publicado.
 * Si no hay conexión o REE falla, lanza un error (lo recoge app.js).
 */
export async function preciosDelDia(fecha) {
  const copia = leerCopia(fecha);
  if (copia) return copia;

  const horas = await descargar(fecha, fecha);
  if (horas) guardarCopia(fecha, horas);
  return horas;
}

/**
 * Precios de varios días seguidos, para el calendario.
 * Devuelve un Map 'AAAA-MM-DD' → horas. Los días que ya están guardados no
 * se vuelven a pedir; el resto se pide a REE en tramos de hasta 31 días.
 */
export async function historial(desde, hasta) {
  const dias = new Map();
  const faltan = [];
  for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
    const copia = leerCopia(fecha);
    if (copia) dias.set(fecha, copia);
    else faltan.push(fecha);
  }

  // Juntamos los días que faltan en tramos seguidos (como mucho 31 días cada uno)
  const tramos = [];
  for (const fecha of faltan) {
    const ultimo = tramos[tramos.length - 1];
    if (ultimo && sumarDias(ultimo.hasta, 1) === fecha && ultimo.dias < MAXIMO_DIAS_POR_PETICION) {
      ultimo.hasta = fecha;
      ultimo.dias++;
    } else {
      tramos.push({ desde: fecha, hasta: fecha, dias: 1 });
    }
  }

  for (const tramo of tramos) {
    const horas = await descargar(tramo.desde, tramo.hasta);
    if (!horas) continue;
    // Repartimos las horas por días (en hora de España)
    const porDia = new Map();
    for (const hora of horas) {
      const fecha = fechaEnEspana(hora.inicio);
      if (!porDia.has(fecha)) porDia.set(fecha, []);
      porDia.get(fecha).push(hora);
    }
    for (const [fecha, horasDelDia] of porDia) {
      dias.set(fecha, horasDelDia);
      guardarCopia(fecha, horasDelDia);
    }
  }
  return dias;
}


/* ---------- Descarga desde Red Eléctrica ---------- */

async function descargar(desde, hasta) {
  const url = `${URL_REE}?start_date=${desde}T00:00&end_date=${hasta}T23:59&time_trunc=hour`;
  let ultimoError;

  // Hasta 2 intentos: el cortafuegos de REE a veces rechaza una petición suelta.
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const respuesta = await fetch(url, { signal: tiempoMaximo(15000) });

      // 502 («datos no disponibles»): ese día aún no se ha publicado.
      if (respuesta.status === 502 || respuesta.status === 404) return null;
      if (!respuesta.ok) throw new Error(`Red Eléctrica ha respondido con el error ${respuesta.status}`);

      return leerRespuesta(await respuesta.json());
    } catch (error) {
      ultimoError = error;
      if (intento === 1) await esperar(2000);
    }
  }
  throw ultimoError;
}

/** Saca las horas del PVPC de la respuesta de REE. */
function leerRespuesta(json) {
  const pvpc = (json.included ?? []).find(
    (indicador) => indicador.id === ID_PVPC || /^pvpc/i.test(indicador.type ?? ''),
  );
  const valores = pvpc?.attributes?.values ?? [];
  if (valores.length === 0) return null;

  // Agrupamos los valores por horas. Hoy REE da uno por hora, pero si algún
  // día los diera cada 15 minutos, así seguiría funcionando (media de la hora).
  const porHora = new Map();
  for (const { value, datetime } of valores) {
    const inicio = new Date(datetime); // "2026-11-22T14:00:00.000+01:00"
    inicio.setUTCMinutes(0, 0, 0);     // a la hora en punto
    const clave = inicio.getTime();
    if (!porHora.has(clave)) porHora.set(clave, []);
    porHora.get(clave).push(value);
  }

  return [...porHora.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([inicio, lista]) => ({
      inicio: new Date(inicio),
      fin: new Date(inicio + HORA),
      // €/MWh → €/kWh (1 MWh = 1000 kWh)
      precio: lista.reduce((suma, valor) => suma + valor, 0) / lista.length / 1000,
    }));
}


/* ---------- Copia guardada en el navegador ---------- */

function leerCopia(fecha) {
  try {
    const texto = localStorage.getItem(PREFIJO + fecha);
    if (!texto) return null;
    const copia = JSON.parse(texto);
    if (copia.version !== VERSION_COPIA || copia.horas.length < 23) return null;
    // En la copia las fechas están como texto: las convertimos otra vez en Date.
    return copia.horas.map((hora) => ({
      inicio: new Date(hora.inicio),
      fin: new Date(hora.fin),
      precio: hora.precio,
    }));
  } catch {
    return null; // copia rota o localStorage bloqueado: la descargaremos otra vez
  }
}

function guardarCopia(fecha, horas) {
  if (horas.length < 23) return; // solo guardamos días completos
  try {
    // JSON.stringify convierte las fechas (Date) en texto automáticamente.
    localStorage.setItem(PREFIJO + fecha, JSON.stringify({ version: VERSION_COPIA, horas }));
    borrarCopiasViejas(fecha);
  } catch {
    // Sin espacio o navegación privada: no pasa nada, la app funciona igual.
  }
}

/** Borra las copias de hace más de 70 días para no acumular datos. */
function borrarCopiasViejas(fecha) {
  const limite = sumarDias(fecha, -DIAS_GUARDADOS);
  for (const clave of Object.keys(localStorage)) {
    if (!clave.startsWith(PREFIJO)) continue;
    const dia = clave.slice(PREFIJO.length);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && dia < limite && dia < fechaEnEspana()) localStorage.removeItem(clave);
  }
}


/* ---------- Pequeñas ayudas ---------- */

function esperar(milisegundos) {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}

/** Corta la petición si tarda demasiado (en navegadores que lo permiten). */
function tiempoMaximo(milisegundos) {
  return typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(milisegundos) : undefined;
}
