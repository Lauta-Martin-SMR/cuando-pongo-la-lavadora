/*
 * editor-tarifa.js
 * ------------------------------------------------------------------
 * El formulario «Tu tarifa de la luz» (el diálogo #dialogo-tarifa de index.html).
 *
 *   const editor = iniciarEditor({ alGuardar: (tarifa) => … });
 *   editor.abrir(tarifa, { campo: 'potencia' });  // campo: a qué parte ir
 *
 * Los números se escriben a la española (0,135). Si alguien escribe céntimos
 * (13,5) o la potencia al año (30,82), se entiende y se avisa debajo.
 */

import { limpiarTarifa, POTENCIA_PVPC } from './tarifas.js';

const $ = (selector) => document.querySelector(selector);
const formato = (valor, decimales) => valor.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

/** «0,135» → 0.135 · «1.200» → 1200 · «» → null · «hola» → NaN */
function leerNumero(texto) {
  let limpio = String(texto ?? '').trim().replace(/\s|€|kWh|kW/gi, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) limpio = limpio.replace(/\./g, ''); // puntos de los miles
  limpio = limpio.replace(',', '.');
  if (!limpio) return null;
  return /^-?\d*\.?\d+$/.test(limpio) ? Number(limpio) : NaN;
}

/**
 * Lee un precio y lo pasa a la unidad buena. Devuelve { valor, nota } o { error }.
 *   tipo 'energia': €/kWh (si pasa de 1,5 se entiende que son céntimos)
 *   tipo 'margen':  €/kWh, puede ser 0 (si pasa de 1 son céntimos)
 *   tipo 'potencia': €/kW y día (si pasa de 1 se entiende que está al año)
 */
function leerPrecio(texto, tipo) {
  const numero = leerNumero(texto);
  if (numero === null) return { valor: null };
  if (Number.isNaN(numero)) return { error: 'Escribe solo el número, por ejemplo 0,135.' };
  if (tipo === 'potencia') {
    if (numero < 0 || numero > 200) return { error: 'Ese precio de la potencia no parece real.' };
    if (numero > 1) return { valor: numero / 365, nota: `= ${formato(numero / 365, 4)} €/kW al día (lo has puesto al año)` };
    return { valor: numero };
  }
  const limite = tipo === 'energia' ? 1.5 : 1;
  if (numero < (tipo === 'margen' ? -0.5 : 0) || numero > 150) return { error: 'Ese precio no parece real. Míralo en tu contrato.' };
  if (Math.abs(numero) > limite) return { valor: numero / 100, nota: `= ${formato(numero / 100, 4)} €/kWh (lo has puesto en céntimos)` };
  if (tipo === 'energia' && numero === 0) return { error: 'El precio no puede ser 0.' };
  return { valor: numero };
}

const escribir = (id, valor, decimales) => {
  $(`#${id}`).value = valor === null || valor === undefined ? '' : formato(valor, decimales).replace(/(,\d*?)0+$/, '$1').replace(/,$/, '');
};

export function iniciarEditor({ alGuardar }) {
  const dialogo = $('#dialogo-tarifa');
  const formulario = $('#formulario-tarifa');
  const radios = (nombre) => [...formulario.querySelectorAll(`input[name="${nombre}"]`)];
  const elegido = (nombre) => radios(nombre).find((r) => r.checked)?.value;

  /** Enseña solo lo que hace falta para el tipo de tarifa elegido */
  function actualizarVisibles() {
    const tipo = elegido('tipo');
    for (const elemento of formulario.querySelectorAll('[data-para]')) {
      elemento.hidden = !elemento.dataset.para.split(' ').includes(tipo);
    }
    // Bono social: solo con el PVPC
    const conBono = tipo === 'pvpc';
    for (const radio of radios('bono')) radio.disabled = !conBono && radio.value !== 'no';
    if (!conBono) radios('bono').find((r) => r.value === 'no').checked = true;
    $('#ayuda-bono').textContent = conBono
      ? 'Solo con el PVPC y hasta 10 kW. Descuentos de 2026, hasta el 31 de diciembre.'
      : 'El bono social solo existe con el PVPC.';
    // El precio de la potencia solo se pregunta en el mercado libre
    $('#precios-potencia').hidden = tipo === 'pvpc';
    $('#caja-potencia-valle').hidden = !$('#potencia-distinta').checked;
    $('#ayuda-zona').textContent = {
      canarias: 'En Canarias no hay IVA, sino IGIC (0 % en viviendas de hasta 10 kW). Las horas, en hora canaria.',
      ceuta: 'En Ceuta hay IPSI en lugar de IVA, y los tramos van una hora más tarde.',
      melilla: 'En Melilla hay IPSI en lugar de IVA, y los tramos van una hora más tarde.',
    }[elegido('zona')] ?? 'Cambian los impuestos y, en Ceuta y Melilla, las horas de cada tramo.';
  }

  /** Debajo de cada precio, cómo lo hemos entendido */
  function actualizarNotas() {
    const tipos = {
      'precio-fijo': 'energia', 'precio-punta': 'energia', 'precio-llano': 'energia', 'precio-valle': 'energia',
      'margen-indexada': 'margen', 'precio-potencia-punta': 'potencia', 'precio-potencia-valle': 'potencia',
    };
    for (const [id, tipo] of Object.entries(tipos)) {
      const resultado = leerPrecio($(`#${id}`).value, tipo);
      const nota = formulario.querySelector(`[data-nota-de="${id}"]`);
      nota.textContent = resultado.error ?? resultado.nota ?? '';
      nota.classList.toggle('entrada__nota--error', Boolean(resultado.error));
    }
  }

  formulario.addEventListener('change', (evento) => {
    if (evento.target.matches('input[type="radio"], input[type="checkbox"]')) {
      actualizarVisibles();
      $('#error-tarifa').textContent = '';
    }
  });
  formulario.addEventListener('input', actualizarNotas);

  // Potencias habituales
  formulario.querySelector('.chips-rapidos').addEventListener('click', (evento) => {
    const chip = evento.target.closest('[data-potencia]');
    if (!chip) return;
    escribir('potencia-contratada', Number(chip.dataset.potencia), 2);
  });

  for (const boton of formulario.querySelectorAll('[data-cerrar]')) {
    boton.addEventListener('click', () => dialogo.close());
  }
  // Tocar fuera de la hoja (en el fondo oscuro) también la cierra
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const resultado = leerFormulario();
    if (resultado.error) {
      $('#error-tarifa').textContent = resultado.error;
      const campo = formulario.querySelector(resultado.campo ?? '[data-campo="tipo"]');
      campo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      campo?.querySelector('input:not([type="radio"])')?.focus({ preventScroll: true });
      return;
    }
    dialogo.close();
    alGuardar(resultado.tarifa);
  });

  function leerFormulario() {
    const tipo = elegido('tipo');
    const precio = (id, clase = 'energia') => leerPrecio($(`#${id}`).value, clase);
    const datos = {
      tipo,
      zona: elegido('zona'),
      bono: elegido('bono'),
      impuestos: $('#ver-impuestos').checked,
      rebaja: $('#rebaja-impuestos').checked,
      contador: elegido('contador'),
      placas: $('#tengo-placas').checked,
      tramos: {},
      precioPotencia: {},
    };

    // Precios de la tarifa elegida
    if (tipo === 'fija') {
      const fijo = precio('precio-fijo');
      if (fijo.error || fijo.valor === null) return { error: fijo.error ?? 'Escribe el precio de la energía de tu contrato.', campo: '[data-para="fija"]' };
      datos.precioFijo = fijo.valor;
    }
    if (tipo === 'tramos') {
      for (const tramo of ['punta', 'llano', 'valle']) {
        const leido = precio(`precio-${tramo}`);
        if (leido.error || leido.valor === null) return { error: leido.error ?? `Falta el precio de ${tramo}.`, campo: '[data-para="tramos"]' };
        datos.tramos[tramo] = leido.valor;
      }
    }
    if (tipo === 'indexada') {
      const margen = precio('margen-indexada', 'margen');
      if (margen.error || margen.valor === null) return { error: margen.error ?? 'Escribe lo que suma tu compañía (si no lo sabes, mira tu contrato; puede ser 0).', campo: '[data-para="indexada"]' };
      datos.margen = margen.valor;
    }

    // Potencia
    const potencia = leerNumero($('#potencia-contratada').value);
    if (potencia === null || Number.isNaN(potencia) || potencia < 0.5 || potencia > 15) {
      return { error: 'Escribe tu potencia contratada en kW (entre 0,5 y 15; en casa suele ser 3,45 o 4,6).', campo: '[data-campo="potencia"]' };
    }
    datos.potencia = potencia;
    if ($('#potencia-distinta').checked) {
      const valle = leerNumero($('#potencia-valle').value);
      if (valle === null || Number.isNaN(valle) || valle < 0.5 || valle > 15) return { error: 'Escribe la potencia de valle en kW.', campo: '#caja-potencia-valle' };
      datos.potenciaValle = valle;
    }
    if (tipo !== 'pvpc') {
      const punta = precio('precio-potencia-punta', 'potencia');
      const valle = precio('precio-potencia-valle', 'potencia');
      if (punta.error || valle.error) return { error: punta.error ?? valle.error, campo: '#precios-potencia' };
      datos.precioPotencia = { punta: punta.valor, valle: valle.valor ?? (punta.valor !== null ? POTENCIA_PVPC.valle : null) };
    }

    // Consumo
    const consumo = leerNumero($('#consumo-mes').value);
    if (Number.isNaN(consumo) || (consumo !== null && (consumo < 1 || consumo > 5000))) {
      return { error: 'Escribe lo que gastas al mes en kWh (viene en tu factura) o déjalo vacío.', campo: '[data-campo="consumo"]' };
    }
    datos.consumo = consumo;

    return { tarifa: limpiarTarifa(datos) };
  }

  return {
    /** Rellena el formulario con la tarifa y lo abre. campo: 'tipo', 'zona', 'bono', 'impuestos', 'potencia', 'contador', 'consumo' o 'placas' */
    abrir(tarifa, { campo = null } = {}) {
      radios('tipo').forEach((r) => { r.checked = r.value === tarifa.tipo; });
      radios('zona').forEach((r) => { r.checked = r.value === tarifa.zona; });
      radios('bono').forEach((r) => { r.checked = r.value === tarifa.bono; });
      radios('contador').forEach((r) => { r.checked = r.value === tarifa.contador; });
      escribir('precio-fijo', tarifa.precioFijo, 4);
      escribir('precio-punta', tarifa.tramos.punta, 4);
      escribir('precio-llano', tarifa.tramos.llano, 4);
      escribir('precio-valle', tarifa.tramos.valle, 4);
      escribir('margen-indexada', tarifa.margen, 4);
      escribir('potencia-contratada', tarifa.potencia, 2);
      $('#potencia-distinta').checked = tarifa.potenciaValle !== null;
      escribir('potencia-valle', tarifa.potenciaValle, 2);
      escribir('precio-potencia-punta', tarifa.precioPotencia.punta, 4);
      escribir('precio-potencia-valle', tarifa.precioPotencia.punta !== null ? tarifa.precioPotencia.valle : null, 4);
      escribir('consumo-mes', tarifa.consumo, 0);
      $('#ver-impuestos').checked = tarifa.impuestos;
      $('#rebaja-impuestos').checked = tarifa.rebaja;
      $('#tengo-placas').checked = tarifa.placas;
      $('#error-tarifa').textContent = '';
      actualizarVisibles();
      actualizarNotas();

      dialogo.showModal();
      const cuerpo = formulario.querySelector('.hoja__cuerpo');
      cuerpo.scrollTop = 0;
      const destino = campo && formulario.querySelector(`[data-campo="${campo}"]`);
      if (destino) {
        destino.scrollIntoView({ block: 'start' });
        destino.classList.remove('campo--resaltado');
        void destino.offsetWidth; // reinicia la animación
        destino.classList.add('campo--resaltado');
        (destino.querySelector('input:checked') ?? destino.querySelector('input'))?.focus({ preventScroll: true });
      } else {
        formulario.querySelector('input[name="tipo"]:checked')?.focus({ preventScroll: true });
      }
    },
  };
}
