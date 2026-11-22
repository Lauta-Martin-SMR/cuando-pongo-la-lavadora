/*
 * ayuda-gasolina.js
 * ------------------------------------------------------------------
 * Lo que sale en la ayuda de la app de la gasolina: los problemas habituales
 * (con su solución), las fuentes de los datos y los pasos de la guía de uso.
 * El botón y las ventanas los hace js/comun/ayuda.js.
 */

import { actualizarApp, ENLACE_AVISO } from '../comun/ayuda.js';

const escritorio = () => window.matchMedia('(min-width: 1280px)').matches;

/** acciones: { buscar, cercaDeMi, recargar, abrirSitios, cerrarPanel } (las pone app.js) */
export function datosAyudaGasolina(acciones) {
  return {
    paraQueSirve: '../ayuda/?desde=gasolina',
    antesDeLaGuia: acciones.cerrarPanel,

    problemas: [
      {
        titulo: 'El mapa no carga o sale gris',
        texto: `<p>Las imágenes del mapa vienen de OpenStreetMap y necesitan conexión. Con poca cobertura tardan un poco; si no salen, vuelve a cargar la página.</p>`,
        boton: { texto: 'Volver a cargar', accion: acciones.recargar },
      },
      {
        titulo: 'No encuentro mi gasolinera',
        texto: `<p>Busca por pueblo, código postal, provincia, marca o calle, y acércate en el mapa: al acercarte, cada punto enseña su precio. Las gasolineras de venta restringida (solo para socios o flotas) no salen.</p>`,
        boton: { texto: 'Buscar', accion: acciones.buscar },
      },
      {
        titulo: 'El precio no es el del surtidor',
        texto: `<p>Los precios son los que cada gasolinera comunica al Ministerio. La app los descarga cada mañana y otra vez por la tarde, pero la gasolinera puede haberlos cambiado después. En la ficha de cada una ves la fecha de los datos.</p>`,
      },
      {
        titulo: '«Cerca de mí» no funciona',
        texto: `<p>Tienes que dar permiso de ubicación al navegador. En el iPhone: Ajustes → Privacidad → Localización → Safari. En Android: mantén pulsado el navegador → Información de la aplicación → Permisos → Ubicación. Si no quieres darlo, busca tu pueblo o tu código postal.</p>`,
        boton: { texto: 'Probar otra vez', accion: acciones.cercaDeMi },
      },
      {
        titulo: 'No se abre Apple Maps o Google Maps',
        texto: `<p>Si no tienes la app instalada, se abre la versión web en el navegador. En un ordenador, Apple Maps solo funciona en Mac.</p>`,
      },
      {
        titulo: 'El historial de una gasolinera sale vacío',
        texto: `<p>El historial se va guardando día a día desde que empezó la app. Si una gasolinera es nueva o no comunicó sus precios esos días, aún no tiene historial.</p>`,
      },
      {
        titulo: 'Quiero guardar mis sitios',
        texto: `<p>En «Mis sitios» puedes guardar los sitios donde sueles repostar (tu pueblo, el trabajo, una marca…). Con un toque, el mapa los busca.</p>`,
        boton: { texto: 'Abrir «Mis sitios»', accion: acciones.abrirSitios },
      },
      {
        titulo: 'La app no se actualiza o se ve rara',
        texto: `<p>Puede que tu móvil tenga guardada una versión vieja. Este botón borra la copia guardada de la app (no tus ajustes ni tus sitios) y la vuelve a cargar.</p>`,
        boton: { texto: 'Actualizar la app', accion: actualizarApp },
      },
      {
        titulo: 'Sigue sin funcionar',
        texto: `<p>Cuéntanos qué te pasa y en qué móvil u ordenador. Lo leeremos para arreglarlo.</p>`,
        enlace: { texto: 'Contarlo en GitHub', href: ENLACE_AVISO },
      },
    ],

    fuentes: [
      {
        nombre: 'Ministerio para la Transición Ecológica · Geoportal de gasolineras',
        texto: 'Los precios de cada gasolinera de España, que las propias gasolineras comunican al Ministerio. Es la fuente oficial.',
        url: 'https://geoportalgasolineras.es/',
      },
      {
        nombre: 'Servicio de precios de carburantes (datos abiertos)',
        texto: 'De aquí descarga la app los precios, cada mañana y otra vez por la tarde, y guarda el historial de los últimos 90 días.',
        url: 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/help',
      },
      {
        nombre: 'OpenStreetMap',
        texto: 'Las imágenes del mapa (calles, carreteras y pueblos), hechas por voluntarios de todo el mundo.',
        url: 'https://www.openstreetmap.org/copyright',
      },
      {
        nombre: 'Leaflet',
        texto: 'La herramienta libre que dibuja el mapa y los puntos de cada gasolinera.',
        url: 'https://leafletjs.com/',
      },
    ],

    pasos: [
      {
        elemento: '.cabecera',
        titulo: 'Bienvenido a la app de la gasolina',
        texto: 'Te enseño para qué sirve cada parte. Pulsa «Siguiente» para seguir, o «Saltar» para salir cuando quieras.',
      },
      {
        elemento: '.buscador',
        titulo: 'Buscador',
        texto: 'Escribe un pueblo, un código postal, una provincia, una marca (Repsol, Plenoil…) o una calle, o pulsa «Cerca de mí» para ver las que tienes alrededor.',
      },
      {
        elemento: '#carburantes',
        titulo: 'Elige el carburante',
        texto: 'Gasolina 95, 98, diésel… El que elijas cambia el mapa, la lista y todos los precios de la página.',
      },
      {
        elemento: () => (escritorio() ? '#sitios' : '#abrir-sitios'),
        titulo: 'Mis sitios',
        texto: 'Guarda los sitios donde sueles repostar (tu pueblo, el trabajo, una marca…). Con un toque, el mapa los busca solo.',
      },
      {
        elemento: '.mapa-caja',
        titulo: 'El mapa',
        texto: 'Cada punto es una gasolinera, del color de su precio: de verde (muy bajo) a rojo (muy alto). La estrella es la recomendada. Toca una para ver sus precios, abrirla en Apple Maps o Google Maps, o ver solo las de su marca.',
      },
      {
        elemento: '.leyenda-mapa',
        titulo: 'Qué significan los colores',
        texto: 'Comparan cada gasolinera con las demás de la zona que estás viendo: el 20 % más barato es «muy bajo» y el 20 % más caro, «muy alto».',
      },
      {
        elemento: '#bloque-lista',
        titulo: 'Las más baratas',
        texto: 'La lista de la zona, de más barata a más cara (o por distancia, si usas tu ubicación). «Ver más» enseña todas y «Ver menos» las vuelve a esconder.',
      },
      {
        elemento: '#destacado',
        titulo: 'El precio medio de España',
        texto: 'Lo que cuesta hoy de media en toda España, si ha subido o bajado en la última semana y en el último mes, y lo que se espera.',
      },
      {
        elemento: '.calculadora',
        titulo: '¿Cuánto me cuesta repostar?',
        texto: 'Elige cuántos litros vas a echar y verás lo que cuesta hoy, comparado con hace un mes y con lo que se espera.',
      },
      {
        elemento: '#grafico-gas',
        titulo: 'Cómo ha cambiado',
        texto: 'El precio medio de los últimos meses. Toca o desliza el dedo por la línea para ver cada día.',
      },
      {
        elemento: '#calendario-gas',
        titulo: 'Calendario',
        texto: 'Cada día con el color de su precio medio. Toca un día para ver lo que costaba repostar.',
      },
      {
        elemento: () => (escritorio() ? '#panel' : '#abrir-panel'),
        titulo: 'Ajustes',
        texto: 'Tema claro u oscuro, tamaño de letra y el acceso a la app de la luz.',
      },
      {
        elemento: () => (escritorio() ? '#ayuda-lateral' : '#ayuda-cabecera'),
        titulo: 'Ayuda',
        texto: 'Aquí vuelves a esta guía, y encuentras soluciones si algo falla, para qué sirve la app y de dónde salen los datos.',
      },
    ],
  };
}
