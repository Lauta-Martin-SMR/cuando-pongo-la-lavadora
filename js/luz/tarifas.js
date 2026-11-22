/*
 * tarifas.js
 * ------------------------------------------------------------------
 * Lo que hace que la luz no cueste lo mismo a todo el mundo:
 *   - el tipo de tarifa: PVPC, precio fijo, tres tramos o indexada
 *   - los tramos de la tarifa 2.0TD (punta, llano y valle), que en Ceuta
 *     y Melilla van una hora más tarde y que los fines de semana y los
 *     festivos nacionales son valle todo el día
 *   - el bono social, los impuestos (IVA, IGIC o IPSI) y la potencia contratada
 *
 * Las cifras oficiales están juntas en OFICIAL, con su fuente. Cambian casi
 * siempre el 1 de enero: entonces solo hay que tocar ese bloque.
 *
 * Este archivo no toca la página: recibe datos y devuelve números.
 */

/* ---------- Cifras oficiales (noviembre de 2026) ---------- */

export const OFICIAL = {
  // Peajes de la CNMC (resolución de 18-12-2025) + cargos del Ministerio
  // (Orden TED/1524/2025) de la tarifa 2.0TD en 2026. Sin impuestos.
  energia: { 1: 0.097553, 2: 0.029267, 3: 0.003292 }, // €/kWh en punta (1), llano (2) y valle (3)
  potencia: { punta: 27.704413, valle: 0.725423 },     // €/kW y año (P1 punta-llano y P2 valle)
  margenPvpc: 3.113,                                    // €/kW y año que añade el PVPC a la potencia P1

  // Lo que pagan todos los contratos (Orden TED/634/2026) y el alquiler del contador
  financiacionBono: 9.011295,                           // € al año
  contador: { monofasico: 0.81, trifasico: 1.36, propio: 0 }, // € al mes

  // Impuestos (Ley 38/1992, Ley 37/1992; Canarias: IGIC; Ceuta y Melilla: IPSI)
  iee: 0.0511269632,      // impuesto especial sobre la electricidad
  ieeMinimo: 0.001,       // …pero nunca menos de 1 € por MWh (0,001 €/kWh)
  iva: 0.21,
  igic: { vivienda: 0, resto: 0.03, contador: 0.07 }, // vivienda de hasta 10 kW: tipo cero
  ipsi: { luz: 0.01, contador: 0.04 },
  // Rebaja temporal como la del Real Decreto-ley 7/2026 (marzo-junio de 2026)
  rebaja: { iva: 0.10, iee: 0.005 },

  // Bono social (descuentos de 2026, prorrogados hasta el 31-12-2026)
  bono: { vulnerable: 0.425, severo: 0.575, hasta: '2026-12-31', limiteAnual: 1587 },
};

/** PVPC: precio de la potencia en €/kW y día (peajes, cargos y margen del PVPC) */
export const POTENCIA_PVPC = {
  punta: (OFICIAL.potencia.punta + OFICIAL.margenPvpc) / 365,
  valle: OFICIAL.potencia.valle / 365,
};

const DIAS_MES = 365 / 12;


/* ---------- Zonas y tramos horarios ---------- */

export const ZONAS = {
  peninsula: { nombre: 'Península', zonaHoraria: 'Europe/Madrid' },
  baleares: { nombre: 'Baleares', zonaHoraria: 'Europe/Madrid' },
  canarias: { nombre: 'Canarias', zonaHoraria: 'Atlantic/Canary' },
  ceuta: { nombre: 'Ceuta', zonaHoraria: 'Europe/Madrid', unaHoraMas: true },
  melilla: { nombre: 'Melilla', zonaHoraria: 'Europe/Madrid', unaHoraMas: true },
};

export const NOMBRE_PERIODO = { 1: 'punta', 2: 'llano', 3: 'valle' };

// Festivos nacionales de fecha fija que no se pueden cambiar: son valle todo el día.
// (No cuentan los de cada comunidad o pueblo, ni el Viernes Santo, que no tiene fecha fija.)
export const FESTIVOS = {
  '01-01': 'Año Nuevo',
  '01-06': 'Reyes',
  '05-01': 'Fiesta del Trabajo',
  '08-15': 'la Asunción',
  '10-12': 'la Fiesta Nacional',
  '11-01': 'Todos los Santos',
  '12-06': 'el Día de la Constitución',
  '12-08': 'la Inmaculada',
  '12-25': 'Navidad',
};

const formatos = new Map();
function partesLocales(instante, zonaHoraria) {
  if (!formatos.has(zonaHoraria)) {
    formatos.set(zonaHoraria, new Intl.DateTimeFormat('en-GB', {
      timeZone: zonaHoraria, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
    }));
  }
  const p = {};
  for (const { type, value } of formatos.get(zonaHoraria).formatToParts(instante)) p[type] = value;
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour), finDeSemana: p.weekday === 'Sat' || p.weekday === 'Sun' };
}

/**
 * ¿Es todo el día valle? Devuelve el motivo ('sábado', 'domingo', 'festivo: Navidad') o null.
 * fecha: 'AAAA-MM-DD'
 */
export function motivoValle(fecha) {
  const festivo = FESTIVOS[fecha.slice(5)];
  if (festivo) return `festivo (${festivo})`;
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  if (dia === 6) return 'sábado';
  if (dia === 0) return 'domingo';
  return null;
}

/** El primer día (desde `fecha`, incluida) que es valle todo el día */
export function proximoDiaValle(fecha) {
  for (let i = 0; i < 8; i++) {
    const dia = new Date(`${fecha}T12:00:00Z`);
    dia.setUTCDate(dia.getUTCDate() + i);
    const texto = dia.toISOString().slice(0, 10);
    const motivo = motivoValle(texto);
    if (motivo) return { fecha: texto, motivo };
  }
  return null;
}

/** Tramo de la tarifa 2.0TD de la hora que empieza en `instante`: 1 punta, 2 llano, 3 valle */
export function periodoDe(instante, zona = 'peninsula') {
  const datosZona = ZONAS[zona] ?? ZONAS.peninsula;
  const { fecha, hora, finDeSemana } = partesLocales(instante, datosZona.zonaHoraria);
  if (finDeSemana || FESTIVOS[fecha.slice(5)] || hora < 8) return 3;
  const punta = datosZona.unaHoraMas
    ? (hora >= 11 && hora < 15) || (hora >= 19 && hora < 23)
    : (hora >= 10 && hora < 14) || (hora >= 18 && hora < 22);
  return punta ? 1 : 2;
}


/* ---------- La tarifa de cada persona ---------- */

const CLAVE = 'cuando-lavadora:tarifa';

export const TARIFA_INICIAL = Object.freeze({
  tipo: 'pvpc',            // 'pvpc' | 'fija' | 'tramos' | 'indexada'
  precioFijo: null,        // €/kWh, sin impuestos (precio fijo)
  tramos: { punta: null, llano: null, valle: null }, // €/kWh, sin impuestos (tres tramos)
  margen: null,            // €/kWh que suma la compañía al mercado (indexada)
  zona: 'peninsula',
  impuestos: false,        // enseñar los precios con impuestos
  rebaja: false,           // hay una rebaja temporal de impuestos (IVA 10 % e impuesto eléctrico 0,5 %)
  bono: 'no',              // 'no' | 'vulnerable' | 'severo' (solo con PVPC)
  potencia: 3.45,          // kW contratados (P1, punta-llano)
  potenciaValle: null,     // kW en valle (P2) si son distintos
  precioPotencia: { punta: null, valle: null }, // €/kW y día (mercado libre); null = como el PVPC
  contador: 'monofasico',  // 'monofasico' | 'trifasico' | 'propio'
  consumo: null,           // kWh al mes, para la factura aproximada
  placas: false,           // tiene placas solares (autoconsumo)
});

const numero = (valor, min, max) => (typeof valor === 'number' && Number.isFinite(valor) && valor >= min && valor <= max ? valor : null);

/** Revisa una tarifa (guardada o del formulario) y corrige lo que no tenga sentido */
export function limpiarTarifa(datos = {}) {
  const t = structuredClone(TARIFA_INICIAL);
  if (!datos || typeof datos !== 'object') return t;
  if (['pvpc', 'fija', 'tramos', 'indexada'].includes(datos.tipo)) t.tipo = datos.tipo;
  t.precioFijo = numero(datos.precioFijo, 0.001, 2);
  for (const tramo of ['punta', 'llano', 'valle']) t.tramos[tramo] = numero(datos.tramos?.[tramo], 0.001, 2);
  t.margen = numero(datos.margen, -0.5, 1);
  if (ZONAS[datos.zona]) t.zona = datos.zona;
  t.impuestos = datos.impuestos === true;
  t.rebaja = datos.rebaja === true;
  if (['vulnerable', 'severo'].includes(datos.bono)) t.bono = datos.bono;
  t.potencia = numero(datos.potencia, 0.5, 15) ?? TARIFA_INICIAL.potencia;
  t.potenciaValle = numero(datos.potenciaValle, 0.5, 15);
  t.precioPotencia.punta = numero(datos.precioPotencia?.punta, 0.001, 1);
  t.precioPotencia.valle = numero(datos.precioPotencia?.valle, 0, 1);
  if (['monofasico', 'trifasico', 'propio'].includes(datos.contador)) t.contador = datos.contador;
  t.consumo = numero(datos.consumo, 1, 5000);
  t.placas = datos.placas === true;

  // Si faltan los precios de su tarifa, volvemos al PVPC (así nunca falta un precio)
  if (t.tipo === 'fija' && t.precioFijo === null) t.tipo = 'pvpc';
  if (t.tipo === 'tramos' && Object.values(t.tramos).some((p) => p === null)) t.tipo = 'pvpc';
  if (t.tipo === 'indexada' && t.margen === null) t.tipo = 'pvpc';
  // El bono social solo existe con el PVPC y hasta 10 kW
  if (t.tipo !== 'pvpc' || Math.max(t.potencia, t.potenciaValle ?? 0) > 10) t.bono = 'no';
  return t;
}

export function leerTarifa() {
  try {
    return limpiarTarifa(JSON.parse(localStorage.getItem(CLAVE)));
  } catch {
    return limpiarTarifa();
  }
}

export function guardarTarifa(tarifa) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(tarifa));
  } catch {
    // Navegación privada: dura hasta cerrar la página
  }
}

export function borrarTarifa() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}


/* ---------- Precio de cada hora ---------- */

/** Descuento del bono social (0,425…) o 0 */
export function descuentoBono(tarifa) {
  return tarifa.tipo === 'pvpc' && tarifa.bono !== 'no' ? OFICIAL.bono[tarifa.bono] : 0;
}

/** Tipo de IVA, IGIC o IPSI de la luz y del contador */
export function impuestoIndirecto(tarifa) {
  const potencia = Math.max(tarifa.potencia, tarifa.potenciaValle ?? 0);
  if (tarifa.zona === 'canarias') {
    return { nombre: 'IGIC', luz: potencia <= 10 ? OFICIAL.igic.vivienda : OFICIAL.igic.resto, contador: OFICIAL.igic.contador };
  }
  if (tarifa.zona === 'ceuta' || tarifa.zona === 'melilla') return { nombre: 'IPSI', ...OFICIAL.ipsi };
  // La rebaja del IVA era para contratos de hasta 10 kW (o con bono social)
  const conRebaja = tarifa.rebaja && (potencia <= 10 || tarifa.bono !== 'no');
  return { nombre: 'IVA', luz: conRebaja ? OFICIAL.rebaja.iva : OFICIAL.iva, contador: OFICIAL.iva };
}

export const tipoImpuestoElectrico = (tarifa) => (tarifa.rebaja ? OFICIAL.rebaja.iee : OFICIAL.iee);

/** €/kWh sin impuestos → €/kWh con el impuesto eléctrico y el IVA (o IGIC, o IPSI) */
export function conImpuestos(precio, tarifa) {
  const electrico = Math.max(precio * tipoImpuestoElectrico(tarifa), OFICIAL.ieeMinimo);
  return (precio + electrico) * (1 + impuestoIndirecto(tarifa).luz);
}

/**
 * Precio de la energía de una hora con la tarifa de la persona (€/kWh, sin impuestos).
 * hora: { inicio, pvpc, spot } (pvpc y spot en €/kWh, como los da Red Eléctrica)
 * conBono: false para calcular sin el descuento del bono social
 */
export function precioDeLaHora(hora, tarifa, { conBono = true } = {}) {
  const periodo = periodoDe(hora.inicio, tarifa.zona);
  let precio;
  if (tarifa.tipo === 'fija') {
    precio = tarifa.precioFijo;
  } else if (tarifa.tipo === 'tramos') {
    precio = tarifa.tramos[NOMBRE_PERIODO[periodo]];
  } else if (tarifa.tipo === 'indexada') {
    // Mercado de esa hora + peajes y cargos de su tramo + lo que suma la compañía
    precio = Number.isFinite(hora.spot) ? hora.spot + OFICIAL.energia[periodo] + tarifa.margen : hora.pvpc + tarifa.margen;
  } else {
    // PVPC. Red Eléctrica lo da con los tramos de la península: en Canarias, Ceuta y
    // Melilla se cambian los peajes y cargos del tramo de la península por los de allí.
    const tramoPeninsula = periodoDe(hora.inicio, 'peninsula');
    precio = hora.pvpc + OFICIAL.energia[periodo] - OFICIAL.energia[tramoPeninsula];
    if (conBono) precio *= 1 - descuentoBono(tarifa);
  }
  return precio;
}

/**
 * Las horas de un día con el precio de la persona.
 * Devuelve [{ inicio, fin, periodo, precio }] con el precio como se va a enseñar
 * (con o sin impuestos, según haya elegido).
 */
export function aplicarTarifa(horas, tarifa) {
  return horas.map((hora) => {
    const sinImpuestos = precioDeLaHora(hora, tarifa);
    return {
      inicio: hora.inicio,
      fin: hora.fin,
      periodo: periodoDe(hora.inicio, tarifa.zona),
      precio: tarifa.impuestos ? conImpuestos(sinImpuestos, tarifa) : sinImpuestos,
    };
  });
}

/** Lo que cuestan `kWh` a un precio medio (tal como se enseña) en euros, con impuestos */
export function eurosConImpuestos(kWh, precioMedio, tarifa) {
  return kWh * (tarifa.impuestos ? precioMedio : conImpuestos(precioMedio, tarifa));
}

/**
 * Con tres tramos, cada hora se colorea por el precio de su tramo: el tramo más
 * barato en verde y el más caro en rojo (normalmente valle y punta).
 * Devuelve una función hora → 'barata' | 'media' | 'cara'.
 */
export function nivelesPorTramo(tarifa) {
  const { punta, llano, valle } = tarifa.tramos;
  const min = Math.min(punta, llano, valle);
  const max = Math.max(punta, llano, valle);
  const nivel = (p) => {
    if (max - min < 1e-9) return 'media';
    if (p <= min + 1e-9) return 'barata';
    if (p >= max - 1e-9) return 'cara';
    return 'media';
  };
  const porPeriodo = { 1: nivel(punta), 2: nivel(llano), 3: nivel(valle) };
  return (hora) => porPeriodo[hora.periodo];
}

/** ¿Cuestan todas estas horas lo mismo? (precio fijo, o tres tramos en fin de semana) */
export function todasIguales(horas) {
  if (!horas.length) return false;
  let min = Infinity;
  let max = -Infinity;
  for (const h of horas) {
    min = Math.min(min, h.precio);
    max = Math.max(max, h.precio);
  }
  return max - min < 1e-6;
}


/* ---------- Lo fijo de la factura y la factura aproximada ---------- */

/** €/kW y día de la potencia (punta y valle) con la tarifa de la persona */
export function preciosPotencia(tarifa) {
  if (tarifa.tipo === 'pvpc') return { ...POTENCIA_PVPC, deLaCompania: false };
  return {
    punta: tarifa.precioPotencia.punta ?? POTENCIA_PVPC.punta,
    valle: tarifa.precioPotencia.valle ?? POTENCIA_PVPC.valle,
    deLaCompania: tarifa.precioPotencia.punta !== null,
  };
}

/**
 * Lo que se paga al mes aunque no se gaste nada, y (si se sabe el consumo) la
 * factura aproximada. precioMedioEnergia: €/kWh sin impuestos y sin bono social.
 */
export function factura(tarifa, precioMedioEnergia = null) {
  const kwPunta = tarifa.potencia;
  const kwValle = tarifa.potenciaValle ?? tarifa.potencia;
  const precios = preciosPotencia(tarifa);
  const descuento = descuentoBono(tarifa);
  const indirecto = impuestoIndirecto(tarifa);
  const tipoElectrico = tipoImpuestoElectrico(tarifa);

  const potencia = (kwPunta * precios.punta + kwValle * precios.valle) * DIAS_MES * (1 - descuento);
  const financiacion = (OFICIAL.financiacionBono / 365) * DIAS_MES;
  const contador = OFICIAL.contador[tarifa.contador];

  // Solo lo fijo
  const electricoFijo = (potencia + financiacion) * tipoElectrico;
  const fijo = (potencia + financiacion + electricoFijo) * (1 + indirecto.luz) + contador * (1 + indirecto.contador);

  let total = null;
  let energia = null;
  if (tarifa.consumo && precioMedioEnergia !== null) {
    // El bono social descuenta la energía solo hasta un límite al año (el de 1 o 2 personas)
    const conDescuento = Math.min(tarifa.consumo, OFICIAL.bono.limiteAnual / 12);
    energia = tarifa.consumo * precioMedioEnergia - conDescuento * precioMedioEnergia * descuento;
    const base = potencia + energia + financiacion;
    const electrico = Math.max(base * tipoElectrico, tarifa.consumo * OFICIAL.ieeMinimo);
    total = (base + electrico) * (1 + indirecto.luz) + contador * (1 + indirecto.contador);
  }
  return { potencia, financiacion, contador, fijo, energia, total, precios, indirecto };
}


/* ---------- Textos ---------- */

export const NOMBRE_TIPO = {
  pvpc: 'PVPC (precio regulado)',
  fija: 'Precio fijo',
  tramos: 'Tres tramos',
  indexada: 'Indexada',
};

/** Las tarifas que cambian de precio cada hora */
export const esVariable = (tarifa) => tarifa.tipo === 'pvpc' || tarifa.tipo === 'indexada';
