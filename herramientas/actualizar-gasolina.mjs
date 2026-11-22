/*
 * actualizar-gasolina.mjs
 * ------------------------------------------------------------------
 * Descarga los precios de los carburantes de todas las gasolineras de
 * España (API pública del Ministerio para la Transición Ecológica) y
 * prepara archivos pequeños para la app:
 *
 *   datos/gasolina.json             precio medio de España, día a día (unos 6 meses)
 *   datos/estaciones.json           todas las gasolineras: marca, dirección, coordenadas, horario
 *   datos/precios-actuales.json     el precio de hoy de cada gasolinera
 *   datos/historial/AAAA-MM-DD/PP.json   precios de cada gasolinera de la provincia PP
 *                                   ese día (últimos 90 días), para su gráfico y su calendario
 *   datos/historial/indice.json     lista de días que hay en el historial
 *
 * La API devuelve unos 12 MB sin comprimir; estos archivos pesan mucho menos
 * y GitHub Pages los sirve comprimidos.
 *
 * Uso (Node 18 o superior, sin instalar nada):
 *   node herramientas/actualizar-gasolina.mjs                 → actualiza el día de hoy
 *   node herramientas/actualizar-gasolina.mjs --rellenar 183  → completa los días que falten
 *
 * Lo ejecuta cada día GitHub Actions (.github/workflows/gasolina.yml).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes';
const DATOS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'datos');
const DIAS_MEDIAS = 200;     // días que se guardan en gasolina.json
const DIAS_HISTORIAL = 90;   // días de historial por gasolinera
const A_LA_VEZ = 2;          // descargas simultáneas al rellenar (para no saturar el servidor)

// Carburantes que enseña la app y su campo en la API
const CARBURANTES = [
  { id: 'g95', nombre: 'Gasolina 95', campo: 'Precio Gasolina 95 E5' },
  { id: 'g98', nombre: 'Gasolina 98', campo: 'Precio Gasolina 98 E5' },
  { id: 'diesel', nombre: 'Diésel', campo: 'Precio Gasoleo A' },
  { id: 'dieselPremium', nombre: 'Diésel Premium', campo: 'Precio Gasoleo Premium' },
  { id: 'glp', nombre: 'GLP (autogás)', campo: 'Precio Gases licuados del petróleo' },
];


/* ---------- Ayudas ---------- */

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

/** "1,399" → 1.399 (o null si está vacío o no tiene sentido) */
function numero(texto) {
  const valor = Number(String(texto ?? '').trim().replace(',', '.'));
  return valor > 0.3 && valor < 4 ? valor : null;
}

/** "ALBACETE" → "Albacete"; "PALMAS (LAS)" → "Las Palmas"; "CORUÑA (A)" → "A Coruña" */
function nombreBonito(texto) {
  let limpio = String(texto ?? '').trim().replace(/\s+/g, ' ');
  const entreParentesis = limpio.match(/^(.*)\s\((.*)\)$/);
  if (entreParentesis) limpio = `${entreParentesis[2]} ${entreParentesis[1]}`;
  const pequenas = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'i', 'a', "d'", 'en']);
  return limpio
    .toLowerCase()
    .split(' ')
    .map((palabra, i) => (i > 0 && pequenas.has(palabra) ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1)))
    .join(' ')
    // Mayúscula también tras «/», «(» y «-»: "Castellón / Castelló", "(Getafe-Villaverde)"
    .replace(/([/(])(\p{L})/gu, (_, signo, letra) => `${signo}${letra.toUpperCase()}`)
    .replace(/-(\p{L})(?=\p{L}{2})/gu, (_, letra) => `-${letra.toUpperCase()}`)
    // "Sant Joan d'Alacant", "L'Hospitalet de Llobregat"
    .replace(/(^|\s)([dl])'(\p{L})/giu, (_, antes, articulo, letra) => `${antes}${antes ? articulo.toLowerCase() : articulo.toUpperCase()}'${letra.toUpperCase()}`);
}

/** "CALLE MAYOR, 3," → "Calle Mayor, 3"; "CARRETERA N-III KM. 11,8" → "Carretera N-III Km. 11,8" */
function direccionBonita(texto) {
  return nombreBonito(texto)
    .replace(/\s+,/g, ',')
    .replace(/,{2,}/g, ',')
    .replace(/^[\s,;-]+|[\s,;-]+$/g, '')
    // «sin número»: "S/N", "SN" → "s/n"
    .replace(/(^|[\s,])s\/?n(?=$|[\s,.;])/gi, '$1s/n')
    // Carreteras en mayúsculas: N-III, A-6, M-40, CV-500, AP-7, LU-P-2901…
    .replace(/\b[a-z]{1,2}-(?:[a-z]{1,2}-)?(?:\d+[a-z]?|[ivx]+)\b/gi, (carretera) => carretera.toUpperCase());
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

const listaDe = (respuesta) => respuesta.ListaEESSPrecio ?? [];
const preciosDe = (estacion) => CARBURANTES.map(({ campo }) => numero(estacion[campo]));
const milesimas = (precio) => (precio === null ? null : Math.round(precio * 1000));

async function escribirJSON(archivo, datos, { compacto = false } = {}) {
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  await fs.writeFile(archivo, `${compacto ? JSON.stringify(datos) : JSON.stringify(datos, null, 1)}\n`);
}

async function leerJSON(archivo, porDefecto) {
  try {
    return JSON.parse(await fs.readFile(archivo, 'utf8'));
  } catch {
    return porDefecto;
  }
}

async function existe(ruta) {
  try {
    await fs.access(ruta);
    return true;
  } catch {
    return false;
  }
}


/* ---------- 1. Precio medio de España (datos/gasolina.json) ---------- */

/** Precio medio de cada carburante a partir de la lista de gasolineras */
function medias(lista) {
  return CARBURANTES.map((_, i) => {
    let suma = 0;
    let cuantas = 0;
    for (const estacion of lista) {
      const precio = preciosDe(estacion)[i];
      if (precio !== null) {
        suma += precio;
        cuantas++;
      }
    }
    return cuantas ? Math.round((suma / cuantas) * 10000) / 10000 : null;
  });
}

async function guardarMedias(medidas) {
  const fechas = Object.keys(medidas.dias).sort().slice(-DIAS_MEDIAS);
  const dias = {};
  for (const fecha of fechas) dias[fecha] = medidas.dias[fecha];
  const salida = {
    actualizado: medidas.actualizado,
    fuente: 'Ministerio para la Transición Ecológica y el Reto Demográfico (Geoportal de gasolineras)',
    nota: 'Precio medio de todas las gasolineras de España, en euros por litro, impuestos incluidos.',
    carburantes: CARBURANTES.map(({ id, nombre }) => ({ id, nombre })),
    dias,
  };
  // Una línea por día: fácil de leer y de comparar en GitHub
  const texto = JSON.stringify(salida, null, 1)
    .replace(/\[\n\s+([^\]]+?)\n\s+\]/g, (_, dentro) => `[${dentro.replace(/\s*\n\s*/g, ' ')}]`);
  await fs.writeFile(path.join(DATOS, 'gasolina.json'), `${texto}\n`);
}


/* ---------- 2. Gasolineras y precios de hoy ---------- */

/**
 * estaciones.json: lo que casi nunca cambia (así el archivo no cambia cada día).
 * Cada gasolinera es una lista: [id, rótulo, dirección, municipio, cp, latitud, longitud, horario, venta]
 * venta: "P" = al público, "R" = restringida a socios (cooperativas…)
 */
async function guardarEstaciones(lista, fecha) {
  const provincias = {};
  const municipios = {};
  const estaciones = [];
  for (const e of lista) {
    const lat = numeroCoordenada(e.Latitud);
    const lon = numeroCoordenada(e['Longitud (WGS84)']);
    if (lat === null || lon === null) continue;
    provincias[e.IDProvincia] = nombreBonito(e.Provincia);
    municipios[e.IDMunicipio] = [nombreBonito(e.Municipio), e.IDProvincia];
    estaciones.push([
      Number(e.IDEESS),
      String(e['Rótulo'] ?? '').trim().replace(/\s+/g, ' '),
      direccionBonita(e['Dirección']),
      Number(e.IDMunicipio),
      String(e['C.P.'] ?? '').trim(),
      lat,
      lon,
      String(e.Horario ?? '').trim(),
      e['Tipo Venta'] === 'R' ? 'R' : 'P',
    ]);
  }
  estaciones.sort((a, b) => a[0] - b[0]);
  const ordenar = (objeto) => Object.fromEntries(Object.entries(objeto).sort((a, b) => Number(a[0]) - Number(b[0])));

  // Una gasolinera por línea: si un día cambia una, el cambio es pequeño
  const cabecera = {
    fuente: 'Ministerio para la Transición Ecológica y el Reto Demográfico (Geoportal de gasolineras)',
    campos: ['id', 'rotulo', 'direccion', 'municipio', 'cp', 'lat', 'lon', 'horario', 'venta'],
    provincias: ordenar(provincias),
    municipios: ordenar(municipios),
  };
  const texto = `${JSON.stringify(cabecera, null, 1).slice(0, -2)},\n "estaciones": [\n${estaciones.map((e) => JSON.stringify(e)).join(',\n')}\n ]\n}\n`;
  await fs.writeFile(path.join(DATOS, 'estaciones.json'), texto);

  // precios-actuales.json: { id: [g95, g98, diesel, dieselPremium, glp] } en milésimas de euro
  const precios = {};
  for (const e of lista) {
    const p = preciosDe(e).map(milesimas);
    if (p.some((v) => v !== null)) precios[e.IDEESS] = p;
  }
  const lineas = Object.entries(precios).sort((a, b) => Number(a[0]) - Number(b[0])).map(([id, p]) => `"${id}":${JSON.stringify(p)}`);
  await fs.writeFile(
    path.join(DATOS, 'precios-actuales.json'),
    `{"fecha":"${fecha}","actualizado":"${new Date().toISOString()}","carburantes":${JSON.stringify(CARBURANTES.map((c) => c.id))},"unidad":"milésimas de euro por litro","precios":{\n${lineas.join(',\n')}\n}}\n`,
  );
  console.log(`estaciones.json: ${estaciones.length} gasolineras · precios-actuales.json: ${lineas.length}`);
}

function numeroCoordenada(texto) {
  const valor = Number(String(texto ?? '').replace(',', '.'));
  return Number.isFinite(valor) && valor !== 0 ? Math.round(valor * 100000) / 100000 : null;
}


/* ---------- 3. Historial por gasolinera (un archivo por provincia y día) ---------- */

async function guardarHistorialDia(fecha, lista) {
  const porProvincia = {};
  for (const e of lista) {
    const p = preciosDe(e).map(milesimas);
    if (!p.some((v) => v !== null)) continue;
    (porProvincia[e.IDProvincia] ??= {})[e.IDEESS] = p;
  }
  const carpeta = path.join(DATOS, 'historial', fecha);
  await fs.mkdir(carpeta, { recursive: true });
  for (const [provincia, precios] of Object.entries(porProvincia)) {
    await escribirJSON(path.join(carpeta, `${provincia}.json`), precios, { compacto: true });
  }
}

async function ordenarHistorial(fechaHoy) {
  const carpeta = path.join(DATOS, 'historial');
  await fs.mkdir(carpeta, { recursive: true });
  const limite = sumarDias(fechaHoy, -DIAS_HISTORIAL);
  const dias = [];
  for (const nombre of await fs.readdir(carpeta)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nombre)) continue;
    if (nombre < limite) await fs.rm(path.join(carpeta, nombre), { recursive: true, force: true });
    else dias.push(nombre);
  }
  dias.sort();
  await escribirJSON(path.join(carpeta, 'indice.json'), { dias }, { compacto: true });
  console.log(`historial: ${dias.length} días (${dias[0]} → ${dias[dias.length - 1]})`);
}


/* ---------- Programa ---------- */

async function hoy(medidas) {
  const respuesta = await descargar(`${API}/EstacionesTerrestres/`);
  const lista = listaDe(respuesta);
  const fecha = fechaEspana();
  medidas.dias[fecha] = medias(lista);
  medidas.actualizado = new Date().toISOString();
  console.log(fecha, medidas.dias[fecha].join(' · '), `(${lista.length} gasolineras)`);
  await guardarEstaciones(lista, fecha);
  await guardarHistorialDia(fecha, lista);
}

/** Completa los días que falten: medias de los últimos `dias` días e historial de los últimos 90 */
async function rellenar(medidas, dias) {
  const fechaHoy = fechaEspana();
  const pendientes = [];
  for (let i = dias; i >= 1; i--) {
    const fecha = sumarDias(fechaHoy, -i);
    const faltaMedia = !medidas.dias[fecha];
    const faltaHistorial = i <= DIAS_HISTORIAL && !(await existe(path.join(DATOS, 'historial', fecha)));
    if (faltaMedia || faltaHistorial) pendientes.push({ fecha, faltaHistorial });
  }
  console.log(`Faltan ${pendientes.length} días`);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < pendientes.length) {
      const { fecha, faltaHistorial } = pendientes[siguiente++];
      const [a, m, d] = fecha.split('-');
      try {
        const lista = listaDe(await descargar(`${API}/EstacionesTerrestresHist/${d}-${m}-${a}`));
        medidas.dias[fecha] ??= medias(lista);
        if (faltaHistorial) await guardarHistorialDia(fecha, lista);
        console.log(fecha, medidas.dias[fecha].join(' · '), faltaHistorial ? '+ historial' : '');
      } catch (error) {
        console.warn(fecha, 'no se pudo descargar:', error.message);
      }
    }
  }
  await Promise.all(Array.from({ length: A_LA_VEZ }, trabajador));
}

const medidas = await leerJSON(path.join(DATOS, 'gasolina.json'), { dias: {} });
const posicion = process.argv.indexOf('--rellenar');
await rellenar(medidas, posicion > -1 ? Number(process.argv[posicion + 1] || 183) : 3);
await hoy(medidas);
await guardarMedias(medidas);
await ordenarHistorial(fechaEspana());
