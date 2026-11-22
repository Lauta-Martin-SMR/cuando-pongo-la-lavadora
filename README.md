# ¿Cuándo es más barata la luz?

Web app (PWA) con dos partes, y una barra a la derecha para pasar de una a otra:

- **La luz** (*¿Cuándo es más barata la luz?*): el precio de la luz en España hora a hora (el **PVPC** o el de **tu tarifa**: precio fijo, tres tramos o indexada, con tu zona, impuestos, bono social y potencia), cuándo es más barato poner cada electrodoméstico y cuánto te costará.
- **La gasolina** (*¿Cuándo echo gasolina?*): un **mapa con todas las gasolineras de España** y su precio, la más barata recomendada, la ficha y el historial de cada una, el precio medio de cada carburante y lo que cuesta repostar.

Está hecha con **HTML, CSS y JavaScript sin frameworks ni compilación**: lo que ves en los archivos es exactamente lo que se ejecuta.

(El repositorio y la dirección se siguen llamando `cuando-pongo-la-lavadora`, el primer nombre de la app.)

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
- **Tu tarifa:** una tarjeta con tu tarifa y el botón **Cambiar**, que abre un formulario con todo lo que hace que el precio sea distinto para cada persona:
  - **Tipo de tarifa:** PVPC (cambia cada hora), **precio fijo** (el mismo a todas horas), **tres tramos** (punta, llano y valle) o **indexada** (precio del mercado de cada hora + lo que suma tu compañía).
  - **Dónde vives:** península, Baleares, Canarias (IGIC en lugar de IVA y horas canarias), Ceuta o Melilla (IPSI y tramos una hora más tarde).
  - **Bono social** (42,5 % o 57,5 % en 2026, solo con el PVPC), **impuestos** (ver los precios con o sin impuestos, y una casilla por si el Gobierno vuelve a rebajarlos), **potencia contratada** (también distinta en valle), precio de la potencia de tu compañía, **contador** y **consumo al mes**.
  - **Placas solares:** te recuerda que con sol lo más barato es usar tu propia luz.
  - Con eso, **todos los precios, colores, horas baratas y costes** pasan a ser los tuyos. La tarjeta enseña también el precio medio de hoy, **lo que pagas fijo al mes** y, si pones tu consumo, tu **factura aproximada**.
- **Fines de semana y festivos:** los sábados, domingos y festivos nacionales todo el día es **valle**. Con tres tramos, la app te dice que cuesta lo mismo a cualquier hora; con PVPC o indexada, que el precio sigue cambiando pero sin el recargo de punta.
- **Cosas a tener en cuenta:** desplegables que explican qué cambia el precio (tarifa fija o variable, fines de semana y festivos, horas punta, potencia, impuestos, bono social, contador, cómo se calcula el PVPC y placas solares), con las cifras oficiales de 2026.
- **Panel de ajustes**, a la izquierda. En el móvil se abre con el botón de arriba; en pantallas anchas está siempre visible, a la izquierda del todo.
  - **Tema** claro, oscuro o automático (oscuro de 20:00 a 8:00).
  - **Tamaño de letra**, con una barra.
  - **Personalizar:** las tarjetas tiemblan como en el iPhone. Puedes **arrastrarlas** (por el asa ⋮⋮) o moverlas con las flechas. Con **−** y **＋** eliges qué aparatos van en la pantalla principal y cuáles en «Más». También se entra en este modo **manteniendo pulsado** un aparato.
  - **Restaurar todo:** lo deja todo como al principio. Aparece al lado de «Personalizar».
- **Columna de la derecha** (en pantallas anchas): el botón de **ayuda** y la **barra Luz/Gasolina**. En el móvil, la ayuda es el botón azul de arriba a la derecha.

### Barra Luz/Gasolina (en las dos)

- Una barra **vertical y redonda**, como un interruptor del iPhone: arriba la **luz** («¿Cuándo es más barata?») y abajo la **gasolina** («¿Dónde es más barata?»), cada una de un color y con un degradado corto donde se juntan. Lleva un **borde de neón rosa**, siempre el mismo.
- La mitad de la página en la que estás va **subrayada con dos líneas negras** y algo más resaltada (la otra, un poco apagada).
- Al tocar la otra mitad, una **lente de cristal** (estilo *liquid glass*) se estira como una gota hasta ella, el resto de la página se funde con un desenfoque y se abre la otra parte, que aparece desde ese desenfoque.
- **No se mueve al bajar por la página:** en pantallas anchas está en la columna de la derecha, debajo de la ayuda; en tabletas, a la derecha y centrada; en el móvil, más pequeña, abajo a la derecha. Mientras mueves las tarjetas con «Personalizar» en el móvil, se esconde.

### La gasolina (`gasolina/index.html`)

- **Buscador:** escribe un pueblo, un código postal, una provincia, una marca (Repsol, Shell…) o una dirección, y el mapa enseña solo esas gasolineras. **Cerca de mí** usa tu ubicación (10 km a tu alrededor).
- **Mapa** con cada gasolinera como un punto de color: verde si su precio es **muy bajo** y rojo si es **muy alto**, comparado con las demás de la zona en cinco niveles. Al acercarte, cada punto enseña su precio. La **recomendada** lleva una estrella ★: es la más barata de la zona o, si has usado «Cerca de mí», la más barata a menos de 5 km.
- **Al tocar una gasolinera:**
  - Una tarjeta encima del mapa con **Abrir en Apple Maps** y **Abrir en Google Maps**, que te llevan hasta allí, y **Ver solo esta marca**.
  - Su **ficha**: precio por litro de cada carburante (con su nivel), horario y distancia.
  - Su **historial** de 1 o 3 meses, con **gráfico** y **calendario**.
- **Filtros:** marca, «Abiertas 24 h» y orden por precio o por distancia. La lista de las más baratas tiene **Ver más / Ver menos**.
- **Precio medio de España:** tarjetas por carburante (Gasolina 95 y 98, Diésel, Diésel Premium y GLP), que miden lo justo para verse **enteras** (4 en pantallas anchas, 3 en el móvil). Como hay más de las que caben, debajo sale una **mini línea** que se arrastra para moverse entre ellas. Además: si es buen momento para repostar, **calculadora** de litros con lo que cuesta hoy y lo esperado en 7 días, y gráfico y calendario de 6 meses.
- **Mis sitios:** guarda los sitios donde sueles repostar (un pueblo, un código postal, una marca o una gasolinera), escribiéndolos o con «Guardar lo que veo». Con un toque, el mapa los busca. En el móvil se abre con el botón «Mis sitios» de la esquina derecha del mapa; en pantallas anchas está en la columna de la derecha.

### Ayuda (en las dos)

El botón azul de ayuda abre un desplegable con:

- **Tengo un problema:** soluciones a lo que suele fallar, algunas con un botón que lo arregla (reintentar, poner tu tarifa, actualizar la app…). Solo se abre una a la vez. En «Sigue sin funcionar», **Contarlo por Gmail** abre un correo ya empezado para p7379491@gmail.com (y también se puede escribir desde cualquier app de correo).
- **Para qué sirve la app:** la página `ayuda/`, con un cuadro oscuro que explica la app de la luz y otro de color melocotón para la de la gasolina.
- **Fuentes:** de dónde salen los datos, con un enlace para visitar cada una.
- **Guía de uso:** oscurece la página e ilumina cada parte. El mensaje (con su icono, una barra de progreso y textos cortos) sale **siempre en el mismo sitio**, abajo en el centro, así **Siguiente** no se mueve; solo sube arriba cuando taparía la barra del móvil. **Saltar** sale. También con el teclado (→, ← y Escape). Se puede abrir directamente con `?guia=1` en la dirección.

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
ayuda/index.html            Página «¿Para qué sirve la app?»
sw.js                       Service worker: guarda la app para abrirla sin conexión

css/
├── comun.css               Colores (tema claro y oscuro), botones, panel, calendario…
├── luz.css                 Lo propio de la app de la luz (gráfico, aparatos, tarifa, Personalizar)
├── gasolina.css            Lo propio de la app de la gasolina (mapa, Mis sitios…)
└── ayuda.css               La página «¿Para qué sirve la app?»

js/
├── comun/                  Piezas que usan las dos apps
│   ├── ajustes.js          Panel de ajustes: tema y tamaño de letra
│   ├── conmutador.js       La barra Luz/Gasolina (lente de cristal y cambio de página)
│   ├── ayuda.js            Botón de ayuda: desplegable, «Tengo un problema» y «Fuentes»
│   ├── guia.js             La guía de uso (oscurece la página e ilumina cada parte)
│   ├── calendario.js       Calendario mensual con colores
│   ├── ordenar.js          Arrastrar para cambiar el orden (con el dedo o el ratón)
│   ├── linea-desplazamiento.js  Mini línea para mover una fila hacia los lados
│   └── iconos.js           Para usar los iconos (icono('i-…'))
├── luz/
│   ├── app.js              Punto de entrada: estado y coordinación
│   ├── api.js              Descarga los precios de Red Eléctrica y guarda copia
│   ├── tarifas.js          Tu tarifa: cifras oficiales, tramos, festivos, impuestos y factura
│   ├── editor-tarifa.js    El formulario «Tu tarifa de la luz»
│   ├── calculos.js         Cuentas: niveles, horas baratas y mejor franja
│   ├── electrodomesticos.js Lista de aparatos con su duración y potencia
│   ├── interfaz.js         Pinta la pantalla
│   ├── ayuda-luz.js        Problemas, fuentes y pasos de la guía de la luz
│   └── personalizar.js     Modo Personalizar
└── gasolina/
    ├── app.js              Punto de entrada: mapa, buscador, ficha y precio medio
    ├── estaciones.js       Carga las gasolineras, reconoce marcas, buscador e historial
    ├── mapa.js             El mapa (puntos de colores, precios, recomendada, tu ubicación)
    ├── sitios.js           «Mis sitios»
    ├── ayuda-gasolina.js   Problemas, fuentes y pasos de la guía de la gasolina
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
herramientas/iconos-en-linea.mjs       Copia los iconos de iconos.svg dentro de cada página
.github/workflows/gasolina.yml         Tarea diaria de GitHub que ejecuta el script
iconos/                     Logos de la app (favicon.svg: la luz; gasolina.svg) y sus PNG,
                            e iconos.svg (todos los dibujos de la interfaz)
```

### Cómo encajan las piezas (luz)

1. **`app.js`** arranca. Aplica tus ajustes, coloca las tarjetas como las dejaste y pide a **`api.js`** los precios de hoy.
2. **`api.js`** mira si ya los tiene guardados en el navegador. Si no, los descarga de Red Eléctrica.
3. **`tarifas.js`** convierte cada hora al precio de tu tarifa (tramo, zona, bono social e impuestos).
4. **`calculos.js`** hace las cuentas: nivel de cada hora, las más baratas y la mejor franja.
5. **`interfaz.js`** lo pinta.
6. Cada 20 segundos, `app.js` comprueba si empezó otro cuarto de hora, si pasó la medianoche o, a partir de las 20:00, si ya están los precios de mañana.

## Los datos

### Luz: API de Red Eléctrica

```
https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real
    ?start_date=2026-11-22T00:00&end_date=2026-11-22T23:59&time_trunc=hour
```

- El PVPC es el indicador `id: "1001"`, en €/MWh. La app lo divide entre 1000 para pasarlo a €/kWh.
- El precio del mercado diario es el `id: "600"`, cada 15 minutos. La app hace la media de cada hora y lo usa para la tarifa indexada.
- El PVPC puede ser **negativo** algunas horas (pasó en octubre de 2026, a mediodía, con mucho sol). La app lo enseña tal cual y avisa de que la energía sale gratis.
- Los días aún no publicados responden con un error 502. Los precios de mañana salen hacia las 20:30.
- Para el calendario, la app pide los dos meses en tramos de 31 días, que es el máximo de REE, y los guarda en el navegador.
- A veces el cortafuegos de Red Eléctrica rechaza alguna petición. La app reintenta y, si no lo consigue, muestra «Reintentar».

**Qué precio es:** el PVPC de la tarifa 2.0TD en la península, con peajes y cargos, pero sin impuestos ni término de potencia. Si cambias «Tu tarifa», la app lo convierte con `js/luz/tarifas.js`:

- **Tramos de la 2.0TD:** punta de 10 a 14 h y de 18 a 22 h, llano de 8 a 10 h, de 14 a 18 h y de 22 a 24 h, y valle de 0 a 8 h, de lunes a viernes. Sábados, domingos y festivos nacionales de fecha fija (1 y 6 de enero, 1 de mayo, 15 de agosto, 12 de octubre, 1 de noviembre y 6, 8 y 25 de diciembre), todo el día valle. En Ceuta y Melilla, una hora más tarde; en Canarias, en hora canaria. (Comprobado con los precios reales: el lunes 12 de octubre de 2026, festivo, el PVPC no llevó el recargo de punta.)
- **Canarias, Ceuta y Melilla:** Red Eléctrica da el PVPC con los tramos de la península; la app cambia los peajes y cargos del tramo de la península por los del tramo de allí.
- **Indexada:** precio del mercado de cada hora + peajes y cargos de su tramo + lo que suma la compañía.
- **Impuestos:** impuesto especial sobre la electricidad (5,11 %, nunca menos de 1 €/MWh) e IVA (21 %), IGIC (0 % en viviendas de hasta 10 kW) o IPSI (1 %).

**Las cifras oficiales** (peajes y cargos de 2026, potencia y margen del PVPC, contador, financiación y descuentos del bono social, impuestos) están juntas en `OFICIAL`, al principio de `js/luz/tarifas.js`, con su fuente. **Cambian casi siempre el 1 de enero:** entonces solo hay que tocar ese bloque.

**El coste de los aparatos** es aproximado: potencia media × horas × precio medio de la franja, con los impuestos de tu zona. **La factura aproximada** suma la potencia, la energía (como si gastaras lo mismo a todas horas), la financiación del bono social, el impuesto eléctrico, el contador y el IVA (o IGIC o IPSI).

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

- **Luz:** cada hora se compara con la media de su día. Verde si está al menos un 10 % por debajo, rojo si está un 10 % por encima y amarillo entre medias. Se cambia con `MARGEN`, en `js/luz/calculos.js`. Con tres tramos, el color es el de su tramo: verde valle, amarillo llano y rojo punta.
- **Calendarios:** los días se reparten en tercios. El tercio más barato va en verde, el más caro en rojo y el resto en amarillo.
- **Gasolina (precio medio):** el precio de hoy frente a la media de 6 meses, con un margen del 2 %.
- **Mapa:** cada gasolinera frente a las demás de la zona que estás viendo, en cinco partes iguales: el 20 % más barato es «muy bajo» y el 20 % más caro, «muy alto».

## Personalizarla desde el código

- **Aparatos:** añade o cambia líneas en `js/luz/electrodomesticos.js` (nombre, minutos, potencia en kW e icono). Los iconos son los `<symbol>` de `iconos/iconos.svg`.
- **Iconos:** `iconos/iconos.svg` es el original, pero cada página lleva una copia dentro (al principio del `<body>`): así salen a la vez que todo y no hay que descargar otro archivo. Si cambias o añades un icono, ejecuta `node herramientas/iconos-en-linea.mjs` para copiarlo en las páginas.
- **Logo:** `iconos/favicon.svg` (un contador con un rayo y el precio de cada hora). Los PNG de la app (`icono-192.png`, `icono-512.png`, `icono-maskable-512.png`, `apple-touch-icon.png` y `favicon-32.png`) salen de él.
- **Barra Luz/Gasolina:** colores, neón y tamaños en la sección 6c de `css/comun.css` (variables `--cm-…`).
- **Colores:** las variables del principio de `css/comun.css`. El tema oscuro está justo debajo.
- **Horario del tema automático:** `HORA_OSCURO` y `HORA_CLARO`, en `js/comun/ajustes.js`. Hay que cambiarlo también en el pequeño `<script>` del `<head>` de las dos páginas.

## Publicarla en GitHub Pages

1. En el repositorio, ve a **Settings → Pages**. En *Source* elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`, y pulsa **Save**.
2. En uno o dos minutos estará en `https://<tu-usuario>.github.io/cuando-pongo-la-lavadora/`.
3. **Tarea diaria de la gasolina:** funciona sola. Puedes verla en la pestaña **Actions**, y también lanzarla a mano con «Run workflow». Si fallara con un error de permisos, ve a **Settings → Actions → General → Workflow permissions** y marca **Read and write permissions**. Si un día ves que se ha parado (GitHub desactiva las tareas programadas de los repositorios públicos sin actividad durante 60 días), vuelve a activarla en **Actions**.

Con una cuenta gratuita, GitHub Pages solo funciona en repositorios **públicos**.

**Al actualizar la app:** si añades o quitas archivos, añádelos a la lista `ARCHIVOS` de `sw.js` y sube la versión (`v6` → `v7`). El historial de las gasolineras no se guarda para usarlo sin conexión (son muchos archivos); todo lo demás sí.

## Ideas para más adelante

- Avisar cuando bajen de precio las gasolineras de «Mis sitios».
- Avisos en el móvil cuando empiece tu franja barata.
- Tarifas de más de 15 kW (3.0TD, con seis tramos).
