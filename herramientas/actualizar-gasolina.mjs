/*
 * actualizar-gasolina.mjs
 * ------------------------------------------------------------------
 * Descarga los precios de los carburantes de todas las gasolineras de
 * España (API pública del Ministerio para la Transición Ecológica),
 * calcula el precio medio de cada carburante y lo guarda, día a día,
 * en datos/gasolina.json. La app de la gasolina solo lee ese archivo,
 * que pesa unos pocos KB en lugar de los 12 MB de la API.
 *
 * Uso (necesita Node 18 o superior, sin instalar nada):
 *   node herramientas/actualizar-gasolina.mjs              → añade/actualiza el día de hoy
 *   node herramientas/actualizar-gasolina.mjs --rellenar 183 → completa los días que falten
 *
 * Lo ejecuta cada día GitHub Actions (.github/workflows/gasolina.yml).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const ARCHIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'datos', 'gasolina.json');
const DIAS_A_GUARDAR = 200;
const A_LA_VEZ = 2; // descargas simultáneas al rellenar (para no saturar el servidor)

// Carburantes que enseña la app y su campo en la API
const CARBURANTES = [
  { id: 'g95', nombre: 'Gasolina 95', campo: 'Precio Gasolina 95 E5' },
  { id: 'g98', nombre: 'Gasolina 98', campo: 'Precio Gasolina 98 E5' },
  { id: 'diesel', nombre: 'Diésel', campo: 'Precio Gasoleo A' },
  { id: 'dieselPremium', nombre: 'Diésel Premium', campo: 'Precio Gasoleo Premium' },
  { id: 'glp', nombre: 'GLP (autogás)', campo: 'Precio Gases licuados del petróleo' },
];

/** Fecha 'AAAA-MM-DD' en hora de España */
function fechaEspana(momento = new Date()) {
  const p = {};
  for (const { type, value } of new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(momento)) p[type] = value;
  return `${p.year}-${p.month}-${p.day}`;
}

function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Descarga con reintentos (el servidor a veces tarda o corta) */
async function descargar(url) {
  for (let intento = 1; ; intento++) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const texto = await respuesta.text();
      return JSON.parse(texto.replace(/^﻿/, ''));
    } catch (error) {
      if (intento >= 4) throw error;
      await new Promise((r) => setTimeout(r, 5000 * intento));
    }
  }
}

/** Precio medio de cada carburante a partir de la lista de gasolineras */
function medias(lista) {
  return CARBURANTES.map(({ campo }) => {
    let suma = 0;
    let cuantas = 0;
    for (const estacion of lista) {
      const precio = Number(String(estacion[campo] ?? '').replace(',', '.'));
      if (precio > 0.3 && precio < 4) { // descartamos valores vacíos o absurdos
        suma += precio;
        cuantas++;
      }
    }
    return cuantas ? Math.round((suma / cuantas) * 10000) / 10000 : null;
  });
}

async function leerArchivo() {
  try {
    return JSON.parse(await fs.readFile(ARCHIVO, 'utf8'));
  } catch {
    return { dias: {} };
  }
}

async function guardarArchivo(datos) {
  const fechas = Object.keys(datos.dias).sort().slice(-DIAS_A_GUARDAR);
  const dias = {};
  for (const fecha of fechas) dias[fecha] = datos.dias[fecha];
  const salida = {
    actualizado: datos.actualizado,
    fuente: 'Ministerio para la Transición Ecológica y el Reto Demográfico (Geoportal de gasolineras)',
    nota: 'Precio medio de todas las gasolineras de España, en euros por litro, impuestos incluidos.',
    carburantes: CARBURANTES.map(({ id, nombre }) => ({ id, nombre })),
    dias,
  };
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  // Una línea por día: fácil de leer y de comparar en GitHub
  const texto = JSON.stringify(salida, null, 1)
    .replace(/\[\n\s+([^\]]+?)\n\s+\]/g, (_, dentro) => `[${dentro.replace(/\s*\n\s*/g, ' ')}]`);
  await fs.writeFile(ARCHIVO, `${texto}\n`);
  console.log(`Guardados ${fechas.length} días en ${ARCHIVO}`);
}

async function hoy(datos) {
  const respuesta = await descargar(`${API}/EstacionesTerrestres/`);
  const fecha = fechaEspana();
  datos.dias[fecha] = medias(respuesta.ListaEESSPrecio);
  datos.actualizado = new Date().toISOString();
  console.log(fecha, datos.dias[fecha].join(' · '), `(${respuesta.ListaEESSPrecio.length} gasolineras)`);
}

async function rellenar(datos, dias) {
  const fechaHoy = fechaEspana();
  const pendientes = [];
  for (let i = dias; i >= 1; i--) {
    const fecha = sumarDias(fechaHoy, -i);
    if (!datos.dias[fecha]) pendientes.push(fecha);
  }
  console.log(`Faltan ${pendientes.length} días`);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < pendientes.length) {
      const fecha = pendientes[siguiente++];
      const [a, m, d] = fecha.split('-');
      try {
        const respuesta = await descargar(`${API}/EstacionesTerrestresHist/${d}-${m}-${a}`);
        datos.dias[fecha] = medias(respuesta.ListaEESSPrecio);
        console.log(fecha, datos.dias[fecha].join(' · '));
      } catch (error) {
        console.warn(fecha, 'no se pudo descargar:', error.message);
      }
    }
  }
  await Promise.all(Array.from({ length: A_LA_VEZ }, trabajador));
}

const datos = await leerArchivo();
const posicion = process.argv.indexOf('--rellenar');
if (posicion > -1) await rellenar(datos, Number(process.argv[posicion + 1] || 183));
else await rellenar(datos, 3); // por si algún día falló la tarea automática
await hoy(datos);
await guardarArchivo(datos);
