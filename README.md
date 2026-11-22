# ¿Cuándo pongo la lavadora?

Web app (PWA) que muestra el precio de la luz **PVPC** en España hora a hora y te dice cuándo es más barato poner la lavadora, el lavavajillas, la secadora o cualquier otro electrodoméstico.

Está hecha con **HTML, CSS y JavaScript sin frameworks ni compilación**: lo que ves en los archivos es exactamente lo que se ejecuta.

## Qué hace

- **Precio de ahora**, con un color según lo cara que esté la luz frente a la media del día.
- **Las 3 horas más baratas que quedan hoy.**
- **Electrodomésticos** (lavadora 2 h, lavavajillas 3 h, secadora 1,5 h, horno, termo y coche eléctrico): calcula la **franja seguida más barata** a partir de ahora. La duración se puede ajustar de media en media hora. Si ya están los precios de mañana, también busca en mañana.
- **Gráfico de barras** de las 24 horas, en verde, amarillo o rojo según el precio. Toca una barra o desliza el dedo para ver el precio de cada hora. Debajo tienes el mínimo, la media, el máximo y una tabla con todas las horas.
- **Hoy y mañana:** los precios de mañana aparecen solos cuando Red Eléctrica los publica, hacia las 20:30.
- **Instalable** en el móvil y funciona **sin conexión** con los últimos precios guardados.

## Cómo probarla en tu ordenador

Esta app **no se abre con doble clic** en `index.html`. Los módulos de JavaScript y el service worker necesitan un servidor, aunque sea local. Con Python, que suele venir instalado:

```bash
cd cuando-pongo-la-lavadora
python3 -m http.server 8000
```

Abre **http://localhost:8000** en el navegador. Para pararlo, pulsa `Ctrl + C`.

Otras opciones: la extensión *Live Server* de VS Code, o `npx serve` si tienes Node.

**Trucos para probar:**

- En Chrome, abre las herramientas de desarrollo (F12) y pulsa el icono de móvil para ver el diseño en tamaño teléfono.
- En la pestaña **Application** de esas herramientas verás el manifiesto, el service worker y los precios guardados (*Local storage*).
- Si cambias algo y no lo ves, recarga la página. El service worker siempre pide primero la versión nueva. Si aun así no cambia, marca *Update on reload* en *Application → Service workers*.
- Desde el móvil, conectado a la misma wifi, puedes abrir `http://IP-de-tu-ordenador:8000` para ver el diseño. Pero **instalarla** solo funciona con HTTPS, así que eso pruébalo cuando esté en GitHub Pages.

## Estructura de archivos

```
cuando-pongo-la-lavadora/
├── index.html             La página: estructura, textos e iconos SVG (al principio del <body>)
├── manifest.webmanifest   Ficha de la app instalable: nombre, iconos y colores
├── sw.js                  Service worker: guarda la app para abrirla sin conexión
├── css/
│   └── estilos.css        Todo el diseño. Colores y medidas en :root, arriba del todo
├── js/
│   ├── app.js             Punto de entrada: estado, lista de electrodomésticos y el «reloj»
│   ├── api.js             Descarga los precios de Red Eléctrica y guarda una copia
│   ├── calculos.js        Las cuentas: horas baratas, colores, mejor franja (no toca el HTML)
│   └── interfaz.js        Pinta la pantalla: tarjetas, resultado y gráfico
└── iconos/                Icono de la app (SVG y PNG en varios tamaños)
```

### Cómo encajan las piezas

1. **`app.js`** arranca y pide a **`api.js`** los precios de hoy.
2. **`api.js`** mira si ya los tiene guardados en el navegador (`localStorage`). Si no, los descarga de Red Eléctrica. Los precios de un día no cambian, así que guardarlos es seguro y la app abre al instante.
3. **`app.js`** pasa los precios a **`calculos.js`**: qué hora es barata, cuáles son las 3 más baratas y cuál es la mejor franja para el electrodoméstico.
4. **`interfaz.js`** recibe esos resultados y los pinta.
5. Cada 20 segundos, `app.js` comprueba tres cosas: si empezó otro cuarto de hora (repinta), si pasó la medianoche (carga el día nuevo) y, a partir de las 20:00, si ya están los precios de mañana.

### Cómo se calcula la mejor franja

`buscarMejorFranja()`, en `calculos.js`, parte el tiempo en tramos de 15 minutos y prueba todas las horas de inicio posibles desde ahora. Para cada una calcula el precio medio durante el programa y se queda con la más barata; si hay empate, con la que empieza antes. Por eso puede recomendar, por ejemplo, la secadora «de 14:30 a 16:00».

Si empezar ya cuesta casi lo mismo (menos de un 3 % más), la app te lo dice, por si no te compensa esperar.

## Los datos de Red Eléctrica

Los precios salen de la API pública y gratuita de Red Eléctrica (no hace falta clave):

```
https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real
    ?start_date=2026-11-22T00:00&end_date=2026-11-22T23:59&time_trunc=hour
```

- La respuesta trae varios indicadores en `included`. El PVPC es el de `id: "1001"`: 24 valores en **€/MWh**, que la app divide entre 1000 para pasarlos a €/kWh.
- Los días de cambio de hora trae 23 o 25 valores, y la app los dibuja tal cual.
- Si pides un día que aún no está publicado, responde con un **error 502**. La app lo interpreta como «todavía no hay precios de mañana».
- La API permite llamadas desde cualquier web (CORS abierto), por eso funciona en GitHub Pages sin servidor propio.
- Red Eléctrica tiene un cortafuegos que a veces rechaza alguna petición. La app reintenta, guarda los precios en el navegador y, si no consigue nada, muestra un aviso con el botón «Reintentar».

**Qué precio es:** el PVPC de la tarifa 2.0TD en la península y en hora peninsular. Incluye peajes y cargos, pero no los impuestos ni el término de potencia.

### Colores

Cada hora se compara con la media de su día:

- **Verde (barata):** al menos un 10 % por debajo de la media.
- **Rojo (cara):** al menos un 10 % por encima.
- **Amarillo (media):** entre medias.

Así, un día con precios muy parecidos sale casi todo amarillo, que es la verdad: ese día da igual cuándo pongas la lavadora. El 10 % se cambia en la constante `MARGEN` de `calculos.js`.

## Personalizarla

- **Añadir o cambiar electrodomésticos:** edita la lista `ELECTRODOMESTICOS` al principio de `js/app.js`. El icono es el `id` de uno de los `<symbol>` del principio de `index.html`; puedes reutilizar uno o dibujar otro.
- **Colores:** cambia las variables de `:root` al principio de `css/estilos.css`.
- **Cuándo es «barata» o «cara»:** la constante `MARGEN` en `js/calculos.js`.

## Publicarla en GitHub Pages

Todos los enlaces son relativos (`./`), así que la app funciona tanto en la raíz de un repositorio como dentro de una carpeta.

**Opción A: desde este repositorio**

1. Lleva estos cambios a la rama principal (`main`), por ejemplo con un *pull request*.
2. En GitHub, ve a **Settings → Pages**. En *Build and deployment* elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
3. En uno o dos minutos estará en `https://<tu-usuario>.github.io/Personal-Cosas/cuando-pongo-la-lavadora/`.

   Con esta opción se publican también las otras webs del repositorio.

**Opción B: un repositorio solo para la app** (dirección más corta)

1. Crea un repositorio nuevo, por ejemplo `cuando-pongo-la-lavadora`.
2. Sube el **contenido** de esta carpeta, de modo que `index.html` quede en la raíz.
3. Activa Pages igual que en la opción A.
4. Estará en `https://<tu-usuario>.github.io/cuando-pongo-la-lavadora/`.

Con una cuenta gratuita, GitHub Pages solo funciona en repositorios **públicos**.

**Instalarla en el móvil:** abre la dirección. En Android (Chrome), pulsa el botón **Instalar** que aparece al final de la página o «Añadir a pantalla de inicio» en el menú. En iPhone (Safari), pulsa **Compartir** y luego **Añadir a pantalla de inicio**.

**Al actualizarla:** sube los cambios y GitHub Pages los publica solo. Si añades o quitas archivos, actualiza la lista `ARCHIVOS` de `sw.js` y cambia `v1` por `v2`.

## Ideas para una versión 2

- Un aviso para no poner electrodomésticos de madrugada (por ruido o seguridad).
- Coste aproximado en euros de cada lavado, según el consumo de cada aparato.
- Otras zonas: Canarias (que además va una hora menos), Baleares, Ceuta y Melilla. La API tiene parámetros para elegir zona; habría que comprobar sus precios.
- Modo oscuro.
- Avisos en el móvil cuando empiece tu franja barata.
