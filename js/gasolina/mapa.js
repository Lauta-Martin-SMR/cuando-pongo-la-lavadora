/*
 * mapa.js
 * ------------------------------------------------------------------
 * El mapa de gasolineras. Usa Leaflet (vendor/leaflet), una librería libre
 * para mapas, y las imágenes del mapa (teselas) de OpenStreetMap, que son
 * gratis y no piden clave. En el tema oscuro se oscurecen con un filtro de
 * CSS (.teselas, en css/gasolina.css).
 *
 *   const mapa = crearMapa(caja, { alElegir: (id) => … });
 *   mapa.mostrar(lista, { recomendada });   // lista: [{ estacion, nivel, precio }]
 *   mapa.elegir(id);                         // marca una gasolinera
 *
 * Cada gasolinera es un punto del color de su nivel de precio. Al acercarse
 * mucho, aparece una etiqueta con su precio. La recomendada lleva una estrella.
 */

import { precio } from './interfaz.js';

const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ESPANA = [[35.95, -9.4], [43.8, 3.3]];
const ZOOM_ETIQUETAS = 14;   // a partir de este zoom se ve el precio encima de cada punto
const MAXIMO_ETIQUETAS = 140;

export function crearMapa(caja, { alElegir }) {
  const L = window.L;
  const mapa = L.map(caja, { preferCanvas: true, minZoom: 5, maxZoom: 18, zoomSnap: 0.5, attributionControl: false });
  mapa.fitBounds(ESPANA);
  // Créditos del mapa arriba a la derecha (abajo los taparía la tarjeta de la gasolinera)
  L.control.attribution({ position: 'topright', prefix: false }).addTo(mapa);

  // Fondo del mapa (el filtro de CSS de .teselas lo adapta al tema claro u oscuro)
  L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19, className: 'teselas' }).addTo(mapa);

  // Al cambiar el tema, los puntos cambian de color
  document.addEventListener('cambiotema', () => {
    pintarPuntos();
    pintarEncima();
  });

  const lienzo = L.canvas({ padding: 0.5 });
  const capaPuntos = L.layerGroup().addTo(mapa);
  const capaEtiquetas = L.layerGroup().addTo(mapa);
  const capaEncima = L.layerGroup().addTo(mapa); // recomendada, elegida y tu ubicación

  let items = [];          // [{ estacion, nivel, precio }]
  let porId = new Map();
  let recomendadaId = null;
  let elegidaId = null;
  let ubicacion = null;

  const color = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  const radio = () => (mapa.getZoom() < 9 ? 4 : mapa.getZoom() < 12 ? 6 : 8);

  /** Puntos de colores (se dibujan en un lienzo: va rápido aunque haya miles) */
  function pintarPuntos() {
    capaPuntos.clearLayers();
    const colores = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, color(`--nivel-${n}`)]));
    const borde = color('--superficie');
    for (const item of items) {
      const punto = L.circleMarker([item.estacion.lat, item.estacion.lon], {
        renderer: lienzo, radius: radio(), weight: 1.5, color: borde, fillColor: colores[item.nivel], fillOpacity: 1,
      });
      punto.on('click', () => alElegir(item.estacion.id));
      punto.addTo(capaPuntos);
    }
  }

  /** Etiquetas con el precio, solo cuando hay zoom suficiente y no son demasiadas */
  let conEtiquetas = false;
  function pintarEtiquetas() {
    capaEtiquetas.clearLayers();
    conEtiquetas = false;
    if (mapa.getZoom() < ZOOM_ETIQUETAS) return;
    const vista = mapa.getBounds().pad(0.1);
    const visibles = items.filter((i) => vista.contains([i.estacion.lat, i.estacion.lon]) && i.estacion.id !== recomendadaId);
    if (visibles.length > MAXIMO_ETIQUETAS) return;
    conEtiquetas = true;
    for (const item of visibles) {
      const elegida = item.estacion.id === elegidaId;
      const etiqueta = L.marker([item.estacion.lat, item.estacion.lon], {
        icon: L.divIcon({ className: '', html: `<span class="pin nivel5--${item.nivel}${elegida ? ' pin--elegida' : ''}">${precio(item.precio)}</span>`, iconSize: null }),
        keyboard: false,
        zIndexOffset: elegida ? 500 : 0,
      });
      etiqueta.on('click', () => alElegir(item.estacion.id));
      etiqueta.addTo(capaEtiquetas);
    }
  }

  /** La recomendada (estrella), la elegida (anillo) y tu ubicación (punto azul) */
  function pintarEncima() {
    capaEncima.clearLayers();
    const recomendada = porId.get(recomendadaId);
    if (recomendada) {
      L.marker([recomendada.estacion.lat, recomendada.estacion.lon], {
        icon: L.divIcon({ className: '', html: `<span class="pin pin--recomendada${recomendadaId === elegidaId ? ' pin--elegida' : ''}">★ ${precio(recomendada.precio)}</span>`, iconSize: null }),
        zIndexOffset: 1000,
        title: 'Gasolinera recomendada',
      }).on('click', () => alElegir(recomendadaId)).addTo(capaEncima);
    }
    // Anillo alrededor del punto elegido (si se ven etiquetas, ya va resaltada la suya)
    const elegida = porId.get(elegidaId);
    if (elegida && !conEtiquetas && elegidaId !== recomendadaId) {
      L.circleMarker([elegida.estacion.lat, elegida.estacion.lon], {
        renderer: lienzo, radius: radio() + 6, weight: 3, color: color('--tinta'), fill: false, interactive: false,
      }).addTo(capaEncima);
    }
    if (ubicacion) {
      L.marker(ubicacion, {
        icon: L.divIcon({ className: '', html: '<span class="yo" aria-label="Tu ubicación"></span>', iconSize: null }),
        interactive: false,
        zIndexOffset: 900,
      }).addTo(capaEncima);
    }
  }

  mapa.on('zoomend', () => {
    pintarPuntos();
    pintarEtiquetas();
    pintarEncima();
  });
  mapa.on('moveend', () => {
    pintarEtiquetas();
    pintarEncima();
  });

  return {
    /** Enseña unas gasolineras. encuadrar: mover el mapa para que se vean todas */
    mostrar(lista, { recomendada = null, encuadrar = true } = {}) {
      items = lista;
      porId = new Map(lista.map((item) => [item.estacion.id, item]));
      recomendadaId = recomendada?.estacion.id ?? null;
      if (elegidaId && !porId.has(elegidaId)) elegidaId = null;
      if (encuadrar && lista.length) {
        const puntos = lista.map((item) => [item.estacion.lat, item.estacion.lon]);
        if (ubicacion) puntos.push(ubicacion);
        mapa.fitBounds(L.latLngBounds(puntos), { padding: [36, 36], maxZoom: 15, animate: false });
      }
      pintarPuntos();
      pintarEtiquetas();
      pintarEncima();
    },

    /**
     * Marca una gasolinera y (si hace falta) mueve el mapa hasta ella.
     * margenAbajo: píxeles tapados por la tarjeta; la gasolinera queda centrada en el resto.
     */
    elegir(id, { acercar = true, margenAbajo = 0 } = {}) {
      elegidaId = id;
      pintarEtiquetas();
      pintarEncima();
      const item = porId.get(id);
      if (item && acercar) {
        const zoom = Math.max(mapa.getZoom(), 15);
        const punto = mapa.project([item.estacion.lat, item.estacion.lon], zoom).add([0, margenAbajo / 2]);
        mapa.flyTo(mapa.unproject(punto, zoom), zoom, { duration: 0.6 });
      }
    },

    deseleccionar() {
      elegidaId = null;
      pintarEtiquetas();
      pintarEncima();
    },

    ponerUbicacion(lat, lon) {
      ubicacion = [lat, lon];
      pintarEncima();
    },

    verEspana() {
      mapa.fitBounds(ESPANA);
    },

    /** Avisar al mapa de que su caja ha cambiado de tamaño */
    recolocar() {
      mapa.invalidateSize();
    },
  };
}
