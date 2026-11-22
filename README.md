# ¿Cuándo pongo la lavadora?

Web app (PWA) con dos partes:

- **La luz:** el precio **PVPC** en España hora a hora, cuándo es más barato poner cada electrodoméstico y cuánto te costará.
- **La gasolina** (*¿Cuándo echo gasolina?*): un **mapa con todas las gasolineras de España** y su precio, la más barata recomendada, la ficha y el historial de cada una, el precio medio de cada carburante y lo que cuesta repostar.

Está hecha con **HTML, CSS y JavaScript sin frameworks ni compilación**: lo que ves en los archivos es exactamente lo que se ejecuta.

## Qué hace

### La luz (`index.html`)

- **Precio de ahora**, con un color según lo cara que esté la luz frente a la media del día. Toca «Ver las próximas horas» para ver un mini gráfico de las siguientes 6 horas.
- **Las 3 horas más baratas que quedan hoy.** Al tocar una, se marca en el gráfico.
- Todos los desplegables cambian a **«Ver menos»** al abrirlos.
- **Electrodomésticos.** En la pantalla principal salen 6: lavadora, lavavajillas, secadora, horno, termo y coche eléctrico. Con **Más ＋** aparecen otros 16, como la freidora de aire, el microondas, las luces, el aire acondicionado o la estufa.
  - Calcula la **franja seguida más barata** a partir de ahora (con mañana incluida si ya está publicado).
  - Te dice el **coste aproximado en euros**, en la mejor franja y si empiezas ya, y cuánto ahorras.
  - La **duración** y la **potencia** de cada aparato se pueden ajustar, y la app las recuerda.
- **Gráfico** de las 24 horas en verde, amarillo o rojo. Toca o desliza el dedo para leer cada hora. Las pestañas son **Hoy**, **Mañana** y **calendario** (📅), que enseña los **dos últimos meses**, cada día con el color de su precio medio.
- **Panel de ajustes**, a la izquierda. En el móvil se abre con el botón de arriba; en pantallas anchas está siempre visible.
  - **Tema** claro, oscuro o automático (oscuro de 20:00 a 8:00).
  - **Tamaño de letra**, con una barra.
  - **Personalizar:** las tarjetas tiemblan como en el iPhone. Puedes **arrastrarlas** (por el asa ⋮⋮) o moverlas con las flechas. Con **−** y **＋** eliges qué aparatos van en la pantalla principal y cuáles en «Más». También se entra en este modo **manteniendo pulsado** un aparato.
  - **Restaurar todo:** lo deja todo como al principio. Aparece al lado de «Personalizar».
  - **Acceso directo** a la app de la gasolina, con un borde de neón animado. También está en la pantalla principal y se puede mover con «Personalizar».

### La gasolina (`gasolina/index.html`)

- **Buscador:** escribe un pueblo, un código postal, una provincia, una marca (Repsol, Shell…) o una dirección, y el mapa enseña solo esas gasolineras. **Cerca de mí** usa tu ubicación (10 km a tu alrededor).
- **Mapa** con cada gasolinera como un punto de color: verde si su precio es **muy bajo** y rojo si es **muy alto**, comparado con las demás de la zona en cinco niveles. Al acercarte, cada punto enseña su precio. La **recomendada** lleva una estrella ★: es la más barata de la zona o, si has usado «Cerca de mí», la más barata a menos de 5 km.
- **Al tocar una gasolinera:**
  - Una tarjeta encima del mapa con **Abrir en Apple Maps** y **Abrir en Google Maps**, que te llevan hasta allí, y **Ver solo esta marca**.
  - Su **ficha**: precio por litro de cada carburante (con su nivel), horario y distancia.
  - Su **historial** de 1 o 3 meses, con **gráfico** y **calendario**.
- **Filtros:** marca, «Abiertas 24 h» y orden por precio o por distancia. La lista de las más baratas tiene **Ver más / Ver menos**.
- **Precio medio de España:** tarjetas por carburante (Gasolina 95 y 98, Diésel, Diésel Premium y GLP), si es buen momento para repostar, **calculadora** de litros con lo que cuesta hoy y lo esperado en 7 días, y gráfico y calendario de 6 meses.

## Cómo probarla en tu ordenador

Esta app **no se abre con doble clic** en `index.html`. Los módulos de JavaScript y el service worker necesitan un servidor, aunque sea local. Con Python:

```bash
cd cuando-pongo-la-lavadora
python -m http.server 8000
```

En Mac o Linux, escribe `python3` en lugar de `python`. Abre **http://localhost:8000** (la luz) o **http://localhost:8000/gasolina/** (la gasolina). Para pararlo, pulsa `Ctrl + C`.

**Trucos:**

- En Chrome, pulsa `F12` y luego el icono del móvil para ver el diseño en tamaño teléfono.
- En la pestaña **Application** de esas herramientas verás el manifiesto, el service worker y lo que guarda la app (*Local storage*).
- Si cambias algo y no lo ves, recarga la página.

## Estructura de archivos

```
index.html                  App de la luz
gasolina/index.html         App de la gasolina
manifest.webmanifest        Ficha de la app instalable (con acceso directo a la gasolina)
sw.js                       Service worker: guarda la app para abrirla sin conexión

css/
├── comun.css               Colores (tema claro y oscuro), botones, panel, calendario…
├── luz.css                 Lo propio de la app de la luz (gráfico, aparatos, Personalizar)
└── gasolina.css            Lo propio de la app de la gasolina

js/
├── comun/                  Piezas que usan las dos apps
│   ├── ajustes.js          Panel de ajustes: tema, tamaño de letra y acceso directo
│   ├── calendario.js       Calendario mensual con colores
│   ├── ordenar.js          Arrastrar para cambiar el orden (con el dedo o el ratón)
│   └── iconos.js           Para usar los iconos de iconos/iconos.svg
├── luz/
│   ├── app.js              Punto de entrada: estado y coordinación
│   ├── api.js              Descarga los precios de Red Eléctrica y guarda copia
│   ├── calculos.js         Cuentas: niveles, horas baratas, mejor franja y coste
│   ├── electrodomesticos.js Lista de aparatos con su duración y potencia
│   ├── interfaz.js         Pinta la pantalla
│   └── personalizar.js     Modo Personalizar
└── gasolina/
    ├── app.js              Punto de entrada: mapa, buscador, ficha y precio medio
    ├── estaciones.js       Carga las gasolineras, reconoce marcas, buscador e historial
    ├── mapa.js             El mapa (puntos de colores, precios, recomendada, tu ubicación)
    ├── linea.js            Gráfico de líneas reutilizable (España y cada gasolinera)
    ├── calculos.js         Cuentas: niveles, recomendada, medias, tendencia
    └── interfaz.js         Pinta la pantalla

vendor/leaflet/             Leaflet 1.9.4, la librería libre del mapa (licencia BSD)

datos/                      Lo genera la tarea diaria de GitHub:
├── gasolina.json           Precio medio de España, día a día (unos 6 meses)
├── estaciones.json         Las ~11.500 gasolineras: marca, dirección, coordenadas, horario
├── precios-actuales.json   El precio de hoy de cada gasolinera
└── historial/              Un archivo por día y provincia con el precio de cada gasolinera (90 días)
herramientas/actualizar-gasolina.mjs   Script que genera los archivos de datos/
.github/workflows/gasolina.yml         Tarea diaria de GitHub que ejecuta el script
iconos/                     Iconos de la app y iconos.svg (todos los dibujos de la interfaz)
```

### Cómo encajan las piezas (luz)

1. **`app.js`** arranca. Aplica tus ajustes, coloca las tarjetas como las dejaste y pide a **`api.js`** los precios de hoy.
2. **`api.js`** mira si ya los tiene guardados en el navegador. Si no, los descarga de Red Eléctrica.
3. **`calculos.js`** hace las cuentas: nivel de cada hora, las más baratas, la mejor franja y su coste.
4. **`interfaz.js`** lo pinta.
5. Cada 20 segundos, `app.js` comprueba si empezó otro cuarto de hora, si pasó la medianoche o, a partir de las 20:00, si ya están los precios de mañana.

## Los datos

### Luz: API de Red Eléctrica

```
https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real
    ?start_date=2026-11-22T00:00&end_date=2026-11-22T23:59&time_trunc=hour
```

- El PVPC es el indicador `id: "1001"`, en €/MWh. La app lo divide entre 1000 para pasarlo a €/kWh.
- Los días aún no publicados responden con un error 502. Los precios de mañana salen hacia las 20:30.
- Para el calendario, la app pide los dos meses en tramos de 31 días, que es el máximo de REE, y los guarda en el navegador.
- A veces el cortafuegos de Red Eléctrica rechaza alguna petición. La app reintenta y, si no lo consigue, muestra «Reintentar».

**Qué precio es:** el PVPC de la tarifa 2.0TD en la península, con peajes y cargos, pero sin impuestos ni término de potencia.

**El coste de los aparatos** es aproximado. Se calcula como potencia media × horas × precio medio de la franja, y luego se suman el impuesto eléctrico (5,11 %) y el IVA (21 %). Lo puedes cambiar en `IMPUESTOS`, en `js/luz/calculos.js`.

### Gasolina: Ministerio para la Transición Ecológica

La API pública del Ministerio da los precios de las ~11.500 gasolineras de España, pero son **12 MB sin comprimir**: demasiado para el móvil. Por eso:

1. `herramientas/actualizar-gasolina.mjs` descarga los datos y prepara archivos pequeños en `datos/`:
   - la **media de España**;
   - la **lista de gasolineras**, que casi nunca cambia;
   - el **precio de hoy** de cada una;
   - el **historial de 90 días**, partido en un archivo por provincia y día.
2. **GitHub Actions** ejecuta ese script **cada día** (`.github/workflows/gasolina.yml`). Al guardarse los archivos, GitHub Pages publica la versión nueva y los sirve comprimidos.
3. La app solo lee esos archivos. La primera vez que usas el mapa descarga unos 500 KB (la lista y los precios de hoy, ya comprimidos). Para el historial de una gasolinera descarga un archivo pequeño por día de su provincia (unos 6 KB cada uno).

Si quieres actualizarlos a mano (hace falta [Node.js](https://nodejs.org) 22 o más nuevo): `node herramientas/actualizar-gasolina.mjs`. Para rellenar días que falten: `node herramientas/actualizar-gasolina.mjs --rellenar 183`.

**Tamaño del repositorio:** el historial ocupa unos 35 MB (unos 390 KB por día) y los días de más de 90 se borran solos. Aun así, Git guarda todo lo que se ha subido alguna vez, así que el repositorio crece unos 80 KB comprimidos al día (unos 30 MB al año). GitHub recomienda que un repositorio no pase de 1 GB, así que hay margen para muchos años. Si algún día quieres menos días, cambia `DIAS_HISTORIAL` en el script.

**El mapa** usa [Leaflet](https://leafletjs.com) (copiado en `vendor/`) y las imágenes del mapa de [OpenStreetMap](https://www.openstreetmap.org/copyright), que son gratis y no piden clave. En el tema oscuro se oscurecen con un filtro de CSS (`.teselas`, en `css/gasolina.css`). Su servidor está pensado para un uso ligero como el de una app personal; si algún día la usara muchísima gente, habría que pasar a un proveedor de mapas propio (casi todos piden una clave).

El «precio esperado» es una recta ajustada a las últimas 4 semanas (regresión lineal) y proyectada 7 días. Es orientativo.

### Colores

- **Luz:** cada hora se compara con la media de su día. Verde si está al menos un 10 % por debajo, rojo si está un 10 % por encima y amarillo entre medias. Se cambia con `MARGEN`, en `js/luz/calculos.js`.
- **Calendarios:** los días se reparten en tercios. El tercio más barato va en verde, el más caro en rojo y el resto en amarillo.
- **Gasolina (precio medio):** el precio de hoy frente a la media de 6 meses, con un margen del 2 %.
- **Mapa:** cada gasolinera frente a las demás de la zona que estás viendo, en cinco partes iguales: el 20 % más barato es «muy bajo» y el 20 % más caro, «muy alto».

## Personalizarla desde el código

- **Aparatos:** añade o cambia líneas en `js/luz/electrodomesticos.js` (nombre, minutos, potencia en kW e icono). Los iconos son los `<symbol>` de `iconos/iconos.svg`.
- **Colores:** las variables del principio de `css/comun.css`. El tema oscuro está justo debajo.
- **Horario del tema automático:** `HORA_OSCURO` y `HORA_CLARO`, en `js/comun/ajustes.js`. Hay que cambiarlo también en el pequeño `<script>` del `<head>` de las dos páginas.

## Publicarla en GitHub Pages

1. En el repositorio, ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
2. En uno o dos minutos estará en `https://<tu-usuario>.github.io/cuando-pongo-la-lavadora/`.
3. **Tarea diaria de la gasolina:** funciona sola. Puedes verla en la pestaña **Actions**, y también lanzarla a mano con «Run workflow». Si fallara con un error de permisos, ve a **Settings → Actions → General → Workflow permissions** y marca **Read and write permissions**. Si un día ves que se ha parado (GitHub desactiva las tareas programadas de los repositorios públicos sin actividad durante 60 días), vuelve a activarla en **Actions**.

Con una cuenta gratuita, GitHub Pages solo funciona en repositorios **públicos**.

**Al actualizar la app:** si añades o quitas archivos, añádelos a la lista `ARCHIVOS` de `sw.js` y sube la versión (`v3` → `v4`). El historial de las gasolineras no se guarda para usarlo sin conexión (son muchos archivos); todo lo demás sí.

## Ideas para más adelante

- Guardar gasolineras favoritas y avisar cuando bajen de precio.
- Avisos en el móvil cuando empiece tu franja barata.
- Otras zonas para la luz: Canarias, Baleares, Ceuta y Melilla.
