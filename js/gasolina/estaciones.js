/*
 * estaciones.js
 * ------------------------------------------------------------------
 * Todo lo que tiene que ver con las gasolineras una a una:
 *   - cargar la lista de España y sus precios de hoy (datos/estaciones.json
 *     y datos/precios-actuales.json, que prepara la tarea diaria de GitHub)
 *   - reconocer la marca de cada una (Repsol, Shell, Cepsa…)
 *   - el buscador (pueblos, códigos postales, provincias, marcas y direcciones)
 *   - el historial de precios de una gasolinera (datos/historial/…)
 */

const DATOS = new URL('../../datos/', import.meta.url);
export const CARBURANTES = ['g95', 'g98', 'diesel', 'dieselPremium', 'glp'];

/** Quita tildes y pasa a minúsculas: «Málaga» → «malaga» (para comparar al buscar) */
export const normalizar = (texto) => String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();


/* ---------- Marcas ---------- */

// Marcas conocidas: si el rótulo contiene alguna de estas palabras, esa es su marca
const MARCAS = [
  ['REPSOL', 'Repsol'], ['CEPSA', 'Cepsa'], ['MOEVE', 'Moeve'], ['SHELL', 'Shell'], ['BP', 'BP'],
  ['GALP', 'Galp'], ['PLENOIL', 'Plenoil'], ['BALLENOIL', 'Ballenoil'], ['PETROPRIX', 'Petroprix'],
  ['CARREFOUR', 'Carrefour'], ['ALCAMPO', 'Alcampo'], ['EROSKI', 'Eroski'], ['AVIA', 'Avia'],
  ['PETRONOR', 'Petronor'], ['DISA', 'Disa'], ['Q8', 'Q8'], ['ESCLATOIL', 'Esclatoil'],
  ['BONAREA', 'bonÀrea'], ['BON AREA', 'bonÀrea'], ['MEROIL', 'Meroil'], ['GASEXPRESS', 'GasExpress'],
  ['EASYGAS', 'Easygas'], ['TAMOIL', 'Tamoil'], ['CAMPSA', 'Campsa'], ['PETROCAT', 'Petrocat'],
  ['VALCARCE', 'Valcarce'], ['SIMON GRUP', 'Simon Grup'], ['GM OIL', 'GM Oil'], ['ENI', 'Eni'],
  ['AGIP', 'Agip'], ['STAR', 'Star'], ['ANDAMUR', 'Andamur'], ['GALPENERGIA', 'Galp'], ['E.LECLERC', 'E.Leclerc'],
  ['HAM', 'HAM'], ['VIA OIL', 'Via Oil'], ['PETROMIRALLES', 'Petromiralles'], ['TGAS', 'Tgas'],
];

/** De un rótulo («REPSOL AUTOGAS», «E.S. SHELL»…) saca la marca: { clave, nombre } */
export function marcaDe(rotulo) {
  const texto = ` ${normalizar(rotulo).toUpperCase().replace(/[^A-Z0-9.Ñ]+/g, ' ')} `;
  for (const [palabra, nombre] of MARCAS) {
    if (texto.includes(` ${palabra} `)) return { clave: palabra === 'BON AREA' ? 'BONAREA' : palabra, nombre };
  }
  const limpio = String(rotulo).trim() || 'Sin marca';
  return { clave: limpio.toUpperCase(), nombre: limpio.charAt(0) + limpio.slice(1).toLowerCase() };
}


/* ---------- Cargar todas las gasolineras ---------- */

let promesaDatos = null;

/**
 * Descarga (una sola vez) las gasolineras de España y sus precios de hoy.
 * Devuelve { lista, municipios, provincias, marcas, fecha }.
 * Cada gasolinera: { id, rotulo, marca, direccion, municipio, provincia, cp, lat, lon,
 *                    horario, publica, precios: { g95: 1.549, … } }
 */
export function cargarEstaciones() {
  promesaDatos ??= (async () => {
    const [estaciones, actuales] = await Promise.all([
      fetch(new URL('estaciones.json', DATOS)).then(comprobar),
      fetch(new URL('precios-actuales.json', DATOS), { cache: 'no-cache' }).then(comprobar),
    ]);

    const provincias = new Map(Object.entries(estaciones.provincias).map(([id, nombre]) => [id, { id, nombre, cuantas: 0 }]));
    const municipios = new Map();
    for (const [id, [nombre, provincia]] of Object.entries(estaciones.municipios)) {
      municipios.set(Number(id), { id: Number(id), nombre, provincia, cuantas: 0, lat: 0, lon: 0 });
    }

    const marcas = new Map();
    const lista = [];
    for (const [id, rotulo, direccion, municipioId, cp, lat, lon, horario, venta] of estaciones.estaciones) {
      const municipio = municipios.get(municipioId);
      if (!municipio) continue;
      const crudos = actuales.precios[id] ?? [];
      const precios = {};
      CARBURANTES.forEach((carburante, i) => {
        if (crudos[i]) precios[carburante] = crudos[i] / 1000; // milésimas → euros
      });
      const marca = marcaDe(rotulo);
      const estacion = {
        id, rotulo, marca, direccion, municipio, provincia: provincias.get(municipio.provincia),
        cp, lat, lon, horario, publica: venta !== 'R', precios,
      };
      lista.push(estacion);
      // Contamos y calculamos el centro de cada municipio (para el buscador y para encuadrar el mapa)
      municipio.cuantas++;
      municipio.lat += lat;
      municipio.lon += lon;
      estacion.provincia.cuantas++;
      const datosMarca = marcas.get(marca.clave) ?? { ...marca, cuantas: 0 };
      datosMarca.cuantas++;
      marcas.set(marca.clave, datosMarca);
    }
    for (const municipio of municipios.values()) {
      if (municipio.cuantas) {
        municipio.lat /= municipio.cuantas;
        municipio.lon /= municipio.cuantas;
      }
    }
    return { lista, municipios, provincias, marcas, fecha: actuales.fecha };
  })();
  promesaDatos.catch(() => { promesaDatos = null; }); // si falla, se podrá reintentar
  return promesaDatos;
}

function comprobar(respuesta) {
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta.json();
}


/* ---------- Buscador ---------- */

/**
 * Sugerencias para lo que se ha escrito. Cada una:
 *   { tipo: 'cp' | 'municipio' | 'provincia' | 'marca' | 'estacion', texto, detalle, valor }
 */
export function sugerencias(texto, datos) {
  const buscado = normalizar(texto);
  if (buscado.length < 2) return [];
  const resultado = [];

  // Código postal: 5 cifras (o empezando por 2-4 cifras)
  if (/^\d{2,5}$/.test(buscado)) {
    const cuantas = datos.lista.filter((e) => e.cp.startsWith(buscado)).length;
    if (cuantas) resultado.push({ tipo: 'cp', texto: `Código postal ${buscado}`, detalle: plural(cuantas), valor: buscado });
    return resultado;
  }

  const encaja = (nombre) => {
    const n = normalizar(nombre);
    return n.startsWith(buscado) ? 2 : n.includes(` ${buscado}`) || n.includes(buscado) ? 1 : 0;
  };
  const mejores = (lista, cuantos) => lista
    .map((elemento) => ({ elemento, nota: encaja(elemento.nombre) }))
    .filter((r) => r.nota > 0)
    .sort((a, b) => b.nota - a.nota || b.elemento.cuantas - a.elemento.cuantas)
    .slice(0, cuantos)
    .map((r) => r.elemento);

  for (const m of mejores([...datos.municipios.values()].filter((m) => m.cuantas), 6)) {
    resultado.push({ tipo: 'municipio', texto: m.nombre, detalle: `${datos.provincias.get(m.provincia)?.nombre ?? ''} · ${plural(m.cuantas)}`, valor: m.id });
  }
  for (const p of mejores([...datos.provincias.values()].filter((p) => p.cuantas), 2)) {
    resultado.push({ tipo: 'provincia', texto: `Provincia de ${p.nombre}`, detalle: plural(p.cuantas), valor: p.id });
  }
  for (const marca of mejores([...datos.marcas.values()].filter((m) => m.cuantas > 1), 4)) {
    resultado.push({ tipo: 'marca', texto: marca.nombre, detalle: `Marca · ${plural(marca.cuantas)} en España`, valor: marca.clave });
  }
  // Direcciones concretas (a partir de 4 letras)
  if (buscado.length >= 4) {
    const estaciones = datos.lista
      .filter((e) => normalizar(e.direccion).includes(buscado))
      .slice(0, 3);
    for (const e of estaciones) {
      resultado.push({ tipo: 'estacion', texto: e.direccion, detalle: `${e.marca.nombre} · ${e.municipio.nombre}`, valor: e.id });
    }
  }
  return resultado;
}

const plural = (n) => `${n.toLocaleString('es-ES')} ${n === 1 ? 'gasolinera' : 'gasolineras'}`;


/* ---------- Distancias ---------- */

/** Distancia en km entre dos puntos (fórmula del semiverseno) */
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}


/* ---------- Historial de una gasolinera ---------- */

let promesaIndice = null;
const cacheDias = new Map(); // 'AAAA-MM-DD/PP' → precios de esa provincia ese día

/**
 * Precios de una gasolinera en los últimos `dias` días: [{ fecha, precios: { g95, … } }]
 * alProgreso(hechos, total) sirve para enseñar «Cargando 12 de 30…».
 */
export async function historialDe(estacion, dias, alProgreso = () => {}) {
  promesaIndice ??= fetch(new URL('historial/indice.json', DATOS), { cache: 'no-cache' }).then(comprobar);
  const { dias: disponibles } = await promesaIndice;
  const fechas = disponibles.slice(-dias);
  const provincia = estacion.provincia.id;
  const resultado = [];
  let hechos = 0;
  let siguiente = 0;

  // Descargamos de 6 en 6 (cada archivo es pequeño)
  async function trabajador() {
    while (siguiente < fechas.length) {
      const fecha = fechas[siguiente++];
      const clave = `${fecha}/${provincia}`;
      if (!cacheDias.has(clave)) {
        try {
          cacheDias.set(clave, await fetch(new URL(`historial/${fecha}/${provincia}.json`, DATOS)).then(comprobar));
        } catch {
          cacheDias.set(clave, {});
        }
      }
      const crudos = cacheDias.get(clave)[estacion.id];
      if (crudos) {
        const precios = {};
        CARBURANTES.forEach((carburante, i) => {
          if (crudos[i]) precios[carburante] = crudos[i] / 1000;
        });
        resultado.push({ fecha, precios });
      }
      alProgreso(++hechos, fechas.length);
    }
  }
  await Promise.all(Array.from({ length: 6 }, trabajador));
  return resultado.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}
