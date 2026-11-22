# ¿Cuándo pongo la lavadora?

Web app (PWA) con dos partes:

- **La luz:** el precio **PVPC** en España hora a hora, cuándo es más barato poner cada electrodoméstico y cuánto te costará.
- **La gasolina** (*¿Cuándo echo gasolina?*): el precio medio de cada carburante, lo que cuesta repostar y cómo ha cambiado en los últimos 6 meses.

Está hecha con **HTML, CSS y JavaScript sin frameworks ni compilación**: lo que ves en los archivos es exactamente lo que se ejecuta.

## Qué hace

### La luz (`index.html`)

- **Precio de ahora**, con un color según lo cara que esté la luz frente a la media del día. Toca «Ver las próximas horas» para ver un mini gráfico de las siguientes 6 horas.
- **Las 3 horas más baratas que quedan hoy.** Al tocar una, se marca en el gráfico.
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
  - **Acceso directo** a la app de la gasolina.

### La gasolina (`gasolina/index.html`)

- **Tarjetas por carburante** (Gasolina 95 y 98, Diésel, Diésel Premium y GLP): precio, cambio en una semana y un mini gráfico del último mes.
- **Precio de hoy** del carburante elegido: si está barato o caro frente a la media de 6 meses, su tendencia y el mínimo y el máximo.
- **Calculadora:** eliges los litros con una barra y te dice **lo que cuesta hoy** y **lo que se espera dentro de 7 días**, según la tendencia de las últimas 4 semanas.
- **Gráfico** de 1, 3 o 6 meses, en el que puedes deslizar el dedo para ver cada día.
- **Calendario de 6 meses**, con el color de cada día. Al tocar un día ves su precio y la diferencia con hoy.

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
    ├── app.js              Punto de entrada: lee los datos y responde a los botones
    ├── calculos.js         Cuentas: medias, variación, tendencia
    └── interfaz.js         Pinta la pantalla (incluido el gráfico de líneas)

datos/gasolina.json         Precio medio de cada carburante, día a día (unos 6 meses)
herramientas/actualizar-gasolina.mjs   Script que genera datos/gasolina.json
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

La API pública del Ministerio da los precios de las ~11.500 gasolineras de España, pero son **12 MB**: demasiado para el móvil. Por eso:

1. `herramientas/actualizar-gasolina.mjs` descarga los datos, calcula la **media de cada carburante** y la guarda en `datos/gasolina.json` (unos pocos KB).
2. **GitHub Actions** ejecuta ese script **cada día** (`.github/workflows/gasolina.yml`). Al guardarse el archivo, GitHub Pages publica la versión nueva.
3. La app solo lee `datos/gasolina.json`.

Si quieres actualizarlo a mano: `node herramientas/actualizar-gasolina.mjs`. Para rellenar días que falten: `node herramientas/actualizar-gasolina.mjs --rellenar 183`.

El «precio esperado» es una recta ajustada a las últimas 4 semanas (regresión lineal) y proyectada 7 días. Es orientativo.

### Colores

- **Luz:** cada hora se compara con la media de su día. Verde si está al menos un 10 % por debajo, rojo si está un 10 % por encima y amarillo entre medias. Se cambia con `MARGEN`, en `js/luz/calculos.js`.
- **Calendarios:** los días se reparten en tercios. El tercio más barato va en verde, el más caro en rojo y el resto en amarillo.
- **Gasolina:** el precio de hoy frente a la media de 6 meses, con un margen del 2 %.

## Personalizarla desde el código

- **Aparatos:** añade o cambia líneas en `js/luz/electrodomesticos.js` (nombre, minutos, potencia en kW e icono). Los iconos son los `<symbol>` de `iconos/iconos.svg`.
- **Colores:** las variables del principio de `css/comun.css`. El tema oscuro está justo debajo.
- **Horario del tema automático:** `HORA_OSCURO` y `HORA_CLARO`, en `js/comun/ajustes.js`. Hay que cambiarlo también en el pequeño `<script>` del `<head>` de las dos páginas.

## Publicarla en GitHub Pages

1. En el repositorio, ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
2. En uno o dos minutos estará en `https://<tu-usuario>.github.io/cuando-pongo-la-lavadora/`.
3. **Tarea diaria de la gasolina:** funciona sola. Puedes verla en la pestaña **Actions**, y también lanzarla a mano con «Run workflow». Si fallara con un error de permisos, ve a **Settings → Actions → General → Workflow permissions** y marca **Read and write permissions**.

Con una cuenta gratuita, GitHub Pages solo funciona en repositorios **públicos**.

**Al actualizar la app:** si añades o quitas archivos, añádelos a la lista `ARCHIVOS` de `sw.js` y sube la versión (`v2` → `v3`).

## Ideas para más adelante

- Precio de la gasolina por provincia y las gasolineras más baratas cerca de ti.
- Avisos en el móvil cuando empiece tu franja barata.
- Otras zonas para la luz: Canarias, Baleares, Ceuta y Melilla.
