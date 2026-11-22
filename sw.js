/*
 * sw.js — el «service worker»
 * ------------------------------------------------------------------
 * Es un pequeño programa que el navegador guarda aparte de la página.
 * Aquí hace dos cosas:
 *   1. Es uno de los requisitos para que la app se pueda instalar.
 *   2. Guarda una copia de los archivos de la app para que abra
 *      aunque no haya conexión.
 *
 * Estrategia «primero la red»: si hay conexión, se descarga siempre la
 * última versión (así ves tus cambios nada más publicarlos en GitHub Pages);
 * si no la hay, se usa la copia guardada.
 *
 * Los precios de Red Eléctrica NO pasan por aquí: los guarda api.js.
 */

// Cambia la versión si añades o quitas archivos de la lista.
const PREFIJO = 'cuando-lavadora-';
const CACHE = `${PREFIJO}v1`;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/estilos.css',
  './js/app.js',
  './js/api.js',
  './js/calculos.js',
  './js/interfaz.js',
  './iconos/favicon.svg',
  './iconos/favicon-32.png',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './iconos/icono-maskable-512.png',
  './iconos/apple-touch-icon.png',
];

// Al instalarse: guarda los archivos de la app
self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting(); // la versión nueva entra en acción sin esperar
});

// Al activarse: borra las copias de versiones anteriores
self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    // Solo las nuestras: en GitHub Pages todas tus webs comparten el mismo
    // origen y podría haber copias de otros proyectos.
    for (const nombre of await caches.keys()) {
      if (nombre.startsWith(PREFIJO) && nombre !== CACHE) await caches.delete(nombre);
    }
    await self.clients.claim();
  })());
});

// Cada vez que la app pide un archivo
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  const url = new URL(peticion.url);

  // Solo nos ocupamos de los archivos de la propia app (la API de REE va directa).
  if (peticion.method !== 'GET' || url.origin !== self.location.origin) return;

  evento.respondWith(primeroLaRed(peticion));
});

async function primeroLaRed(peticion) {
  const cache = await caches.open(CACHE);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) await cache.put(peticion, respuesta.clone()); // actualizamos la copia
    return respuesta;
  } catch (error) {
    // Sin conexión: devolvemos la copia guardada
    const copia = await cache.match(peticion, { ignoreSearch: true });
    if (copia) return copia;
    if (peticion.mode === 'navigate') return cache.match('./index.html');
    throw error;
  }
}
