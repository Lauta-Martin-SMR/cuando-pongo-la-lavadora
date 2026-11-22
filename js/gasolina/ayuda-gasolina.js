/*
 * ayuda-gasolina.js
 * ------------------------------------------------------------------
 * Lo que sale en la ayuda de la app de la gasolina: los problemas habituales
 * (con su solución), las fuentes de los datos y los pasos de la guía de uso.
 * El botón y las ventanas los hace js/comun/ayuda.js.
 */

import { actualizarApp } from '../comun/ayuda.js';

const escritorio = () => window.matchMedia('(min-width: 1280px)').matches;

/** acciones: { buscar, cercaDeMi, recargar, abrirSitios, cerrarPanel } (las pone app.js) */
export function datosAyudaGasolina(acciones) {
  return {
    app: 'gasolina',
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
        contacto: true,
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
        icono: 'i-guia',
        titulo: 'Bienvenido a la app de la gasolina',
        texto: 'Te enseño cada parte en un momento. «Siguiente» para seguir; «Saltar» para salir.',
      },
      {
        elemento: '.buscador',
        icono: 'i-lupa',
        titulo: 'Buscador',
        texto: 'Escribe un pueblo, un código postal, una marca o una calle, o usa «Cerca de mí».',
      },
      {
        elemento: '#carburantes',
        icono: 'i-gota',
        titulo: 'Carburantes',
        texto: 'El precio medio de cada uno en España. El que elijas cambia el mapa y la lista.',
      },
      {
        elemento: () => (escritorio() ? '#sitios' : '#abrir-sitios'),
        icono: 'i-marcador',
        titulo: 'Mis sitios',
        texto: 'Guarda donde sueles repostar y el mapa lo busca con un toque.',
      },
      {
        elemento: '.mapa-caja',
        icono: 'i-lugar',
        titulo: 'El mapa',
        texto: 'Cada punto es una gasolinera, del color de su precio; la ★ es la recomendada. Toca una para ver sus precios.',
      },
      {
        elemento: '.leyenda-mapa',
        icono: 'i-info',
        titulo: 'Los colores',
        texto: 'Comparan con las demás de la zona: verde, de las más baratas; rojo, de las más caras.',
      },
      {
        elemento: '#bloque-lista',
        icono: 'i-estrella',
        titulo: 'Las más baratas',
        texto: 'La lista de la zona, por precio o por distancia. «Ver más» enseña todas.',
      },
      {
        elemento: '#destacado',
        icono: 'i-euro',
        titulo: 'Precio medio de España',
        texto: 'Lo que cuesta hoy, cómo ha cambiado esta semana y este mes, y lo que se espera.',
      },
      {
        elemento: '.calculadora',
        icono: 'i-surtidor',
        titulo: '¿Cuánto me cuesta repostar?',
        texto: 'Elige los litros y verás lo que pagas hoy y hace un mes.',
      },
      {
        elemento: '#grafico-gas',
        icono: 'i-sube',
        titulo: 'Cómo ha cambiado',
        texto: 'El precio medio de los últimos meses. Desliza por la línea para ver cada día.',
      },
      {
        elemento: '#calendario-gas',
        icono: 'i-calendario',
        titulo: 'Calendario',
        texto: 'Cada día con el color de su precio. Toca uno para ver lo que costaba.',
      },
      {
        elemento: () => (escritorio() ? '#panel' : '#abrir-panel'),
        icono: 'i-ajustes',
        titulo: 'Ajustes',
        texto: 'Tema claro u oscuro y tamaño de letra.',
      },
      {
        elemento: () => (escritorio() ? '#ayuda-lateral' : '#ayuda-cabecera'),
        icono: 'i-ayuda',
        titulo: 'Ayuda',
        texto: 'Vuelve a esta guía, soluciona problemas y mira de dónde salen los datos.',
      },
      {
        elemento: '#conmutador',
        icono: 'i-rayo',
        titulo: 'Luz y gasolina',
        texto: 'Toca «Luz» para ver cuándo es más barata. La barra no se mueve: siempre está a mano.',
      },
    ],
  };
}
