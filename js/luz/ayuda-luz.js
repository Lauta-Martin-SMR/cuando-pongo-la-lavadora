/*
 * ayuda-luz.js
 * ------------------------------------------------------------------
 * Lo que sale en la ayuda de la app de la luz: los problemas habituales
 * (con su solución), las fuentes de los datos y los pasos de la guía de uso.
 * El botón y las ventanas los hace js/comun/ayuda.js.
 */

import { actualizarApp, ENLACE_AVISO } from '../comun/ayuda.js';

const escritorio = () => window.matchMedia('(min-width: 1280px)').matches;

/** acciones: { reintentar, abrirTarifa(campo), restaurar, cerrarPanel } (las pone app.js) */
export function datosAyudaLuz(acciones) {
  return {
    paraQueSirve: 'ayuda/',
    antesDeLaGuia: acciones.cerrarPanel,

    problemas: [
      {
        titulo: 'No me salen los precios',
        texto: `<p>Revisa que tengas conexión a internet. Red Eléctrica a veces tarda o falla un rato: la app lo vuelve a intentar sola cada 5 minutos, y mientras tanto usa los precios que ya tenía guardados.</p>`,
        boton: { texto: 'Reintentar ahora', accion: acciones.reintentar },
      },
      {
        titulo: 'Los precios no son los de mi factura',
        texto: `<p>Si no cambias nada, la app enseña el <strong>PVPC sin impuestos</strong>, como lo publica Red Eléctrica. Si tienes otra tarifa (precio fijo, tres tramos o indexada), bono social, o vives en Canarias, Ceuta o Melilla, ponlo en «Tu tarifa» y verás tu precio de verdad. También puedes ver los precios con impuestos.</p>`,
        boton: { texto: 'Poner mi tarifa', accion: () => acciones.abrirTarifa('tipo') },
      },
      {
        titulo: 'El fin de semana el precio sigue cambiando',
        texto: `<p>Es normal con el <strong>PVPC</strong> y con las tarifas <strong>indexadas</strong>: los sábados, domingos y festivos nacionales todo el día es valle (no hay recargo de las horas punta), pero la energía se sigue comprando hora a hora, así que el precio cambia. Solo con una tarifa de <strong>tres tramos</strong> cuesta lo mismo todo el día esos días.</p>`,
        boton: { texto: 'Ver mi tarifa', accion: () => acciones.abrirTarifa('tipo') },
      },
      {
        titulo: 'No salen los precios de mañana',
        texto: `<p>Red Eléctrica los publica cada tarde, hacia las 20:30. A partir de las 20:00 la app mira cada 10 minutos y te avisa cuando ya están.</p>`,
      },
      {
        titulo: 'El coste de un aparato no me cuadra',
        texto: `<p>Es aproximado: usa la potencia media del aparato y el tiempo que lo tienes puesto. Cámbialos con los botones − y + que hay debajo del aparato. Si tu precio de la luz es otro, ponlo en «Tu tarifa».</p>`,
        boton: { texto: 'Revisar mi tarifa', accion: () => acciones.abrirTarifa('tipo') },
      },
      {
        titulo: 'La app no se actualiza o se ve rara',
        texto: `<p>Puede que tu móvil tenga guardada una versión vieja. Este botón borra la copia guardada de la app (no tus ajustes) y la vuelve a cargar.</p>`,
        boton: { texto: 'Actualizar la app', accion: actualizarApp },
      },
      {
        titulo: 'No sé cómo instalarla en el móvil',
        texto: `<p><strong>Android (Chrome):</strong> abre el menú ⋮ y pulsa «Instalar aplicación» o «Añadir a pantalla de inicio».</p>
          <p><strong>iPhone (Safari):</strong> pulsa el botón Compartir (el cuadrado con la flecha) y luego «Añadir a pantalla de inicio».</p>`,
      },
      {
        titulo: 'Se ha descolocado todo',
        texto: `<p>Con «Restaurar todo» las tarjetas, los aparatos, el tema y el tamaño de letra vuelven a estar como al principio. Tu tarifa no se borra.</p>`,
        boton: { texto: 'Restaurar todo', accion: acciones.restaurar },
      },
      {
        titulo: 'Sigue sin funcionar',
        texto: `<p>Cuéntanos qué te pasa y en qué móvil u ordenador. Lo leeremos para arreglarlo.</p>`,
        enlace: { texto: 'Contarlo en GitHub', href: ENLACE_AVISO },
      },
    ],

    fuentes: [
      {
        nombre: 'Red Eléctrica · API de datos',
        texto: 'El precio PVPC de cada hora y el precio del mercado diario (para la tarifa indexada). Los de mañana se publican cada tarde, hacia las 20:30.',
        url: 'https://www.ree.es/es/apidatos',
      },
      {
        nombre: 'ESIOS (Red Eléctrica) · PVPC',
        texto: 'La página oficial del PVPC, con sus precios de cada hora y cómo se calculan.',
        url: 'https://www.esios.ree.es/es/pvpc',
      },
      {
        nombre: 'CNMC · Peajes de 2026',
        texto: 'Los peajes de transporte y distribución de la tarifa 2.0TD (resolución de 18 de diciembre de 2025).',
        url: 'https://www.cnmc.es/',
      },
      {
        nombre: 'BOE · Orden TED/1524/2025',
        texto: 'Los cargos del sistema eléctrico de 2026. Junto con los peajes, son lo que el Estado suma a cada kWh y a cada kW de potencia.',
        url: 'https://www.boe.es/eli/es/o/2025/12/23/ted1524',
      },
      {
        nombre: 'BOE · Ley 38/1992 de Impuestos Especiales',
        texto: 'El impuesto especial sobre la electricidad: 5,11 % (y nunca menos de 1 € por cada 1.000 kWh).',
        url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741',
      },
      {
        nombre: 'BOE · Real Decreto-ley 7/2026',
        texto: 'La rebaja temporal de impuestos de la luz (IVA al 10 % e impuesto eléctrico al 0,5 %) del 22 de marzo al 30 de junio de 2026.',
        url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2026-6544',
      },
      {
        nombre: 'Bono social · Gobierno de España',
        texto: 'Quién puede pedirlo, los descuentos (42,5 % y 57,5 % en 2026) y los límites de consumo.',
        url: 'https://www.bonosocial.gob.es/',
      },
    ],

    pasos: [
      {
        elemento: '.cabecera',
        titulo: 'Bienvenido a la app de la luz',
        texto: 'Te enseño para qué sirve cada parte. Pulsa «Siguiente» para seguir, o «Saltar» para salir cuando quieras.',
      },
      {
        elemento: '#ahora',
        titulo: 'El precio de ahora',
        texto: 'Lo que cuesta la luz en esta hora con tu tarifa, y si es barata, media o cara comparada con el resto del día. Con «Ver las próximas horas» ves cómo va a cambiar.',
      },
      {
        elemento: '#tarifa',
        titulo: 'Tu tarifa',
        texto: 'Pon aquí tu tarifa (PVPC, precio fijo, tres tramos o indexada), dónde vives, el bono social, los impuestos y tu potencia. Así todos los precios y costes son los tuyos de verdad.',
      },
      {
        elemento: '[data-seccion="gasolina"] .atajo',
        titulo: '¿Cuándo echo gasolina?',
        texto: 'Te lleva a la otra parte de la app: los precios de todas las gasolineras de España en un mapa.',
      },
      {
        elemento: '[data-seccion="baratas"] .bloque',
        titulo: 'Las horas más baratas',
        texto: 'Las tres horas más baratas que quedan hoy. Toca una para verla en el gráfico. Si con tu tarifa todas cuestan lo mismo, te lo decimos.',
      },
      {
        elemento: '#electros',
        titulo: '¿Qué quieres poner?',
        texto: 'Elige un aparato. Con «Ver más» salen todos los demás, y con «Ver menos» se vuelven a esconder.',
      },
      {
        elemento: '#tarjeta-resultado',
        titulo: 'El mejor momento y lo que cuesta',
        texto: 'Cuándo empezar para que salga más barato y lo que te costará con impuestos, comparado con empezar ya. Cambia la duración y la potencia con − y +.',
      },
      {
        elemento: '#bloque-grafico',
        titulo: 'El precio de cada hora',
        texto: 'Toca o desliza el dedo por las barras para ver cada hora. Arriba eliges hoy, mañana (desde las 20:30) o cualquier día de los dos últimos meses en el calendario.',
      },
      {
        elemento: '#claves',
        titulo: 'Cosas a tener en cuenta',
        texto: 'Todo lo que cambia tu precio: tarifa fija o variable, fines de semana y festivos (todo el día valle), horas punta, potencia, impuestos, bono social y placas solares.',
      },
      {
        elemento: () => (escritorio() ? '#panel' : '#abrir-panel'),
        titulo: 'Ajustes',
        texto: 'Tema claro u oscuro, tamaño de letra y «Personalizar» para mover las tarjetas y elegir qué aparatos salen en la pantalla principal.',
      },
      {
        elemento: () => (escritorio() ? '#ayuda-lateral' : '#ayuda-cabecera'),
        titulo: 'Ayuda',
        texto: 'Aquí vuelves a esta guía, y encuentras soluciones si algo falla, para qué sirve la app y de dónde salen los datos.',
      },
      {
        elemento: '.lateral .atajo',
        titulo: '¿Cuándo echo gasolina?',
        texto: 'Te lleva a la app de la gasolina: los precios de todas las gasolineras de España en un mapa, con la más barata recomendada.',
      },
    ],
  };
}
