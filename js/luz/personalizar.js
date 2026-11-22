/*
 * personalizar.js
 * ------------------------------------------------------------------
 * Modo «Personalizar» de la app de la luz:
 *   - Las tarjetas y los aparatos tiemblan, como los iconos del iPhone.
 *   - Se arrastran para cambiar el orden (o con las flechas ↑ ↓).
 *   - Con − y ＋ un aparato pasa de la pantalla principal a «Más» y al revés.
 *   - Mantener pulsado un aparato también entra en este modo.
 * El diseño (orden de las tarjetas y de los aparatos) se guarda en el navegador.
 */

import { hacerOrdenable } from '../comun/ordenar.js';
import { ELECTRODOMESTICOS, PRINCIPALES_INICIALES } from './electrodomesticos.js';

const CLAVE = 'cuando-lavadora:diseno';
const SECCIONES = ['ahora', 'tarifa', 'baratas', 'electros', 'grafico', 'claves'];
const SUAVE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Cómo está todo al principio */
export function disenoInicial() {
  return {
    secciones: [...SECCIONES],
    principales: [...PRINCIPALES_INICIALES],
    mas: ELECTRODOMESTICOS.map((e) => e.id).filter((id) => !PRINCIPALES_INICIALES.includes(id)),
  };
}

/** Lee el diseño guardado y lo revisa (por si una versión nueva trae aparatos nuevos) */
export function leerDiseno() {
  const inicial = disenoInicial();
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (!guardado) return inicial;
    const existen = new Set(ELECTRODOMESTICOS.map((e) => e.id));
    const secciones = (guardado.secciones ?? []).filter((s) => SECCIONES.includes(s));
    // Las tarjetas nuevas de una versión nueva entran en su sitio (detrás de la que tienen delante)
    SECCIONES.forEach((s, i) => {
      if (secciones.includes(s)) return;
      const anterior = SECCIONES.slice(0, i).reverse().find((x) => secciones.includes(x));
      secciones.splice(anterior ? secciones.indexOf(anterior) + 1 : 0, 0, s);
    });
    const principales = (guardado.principales ?? []).filter((id) => existen.has(id));
    const mas = (guardado.mas ?? []).filter((id) => existen.has(id) && !principales.includes(id));
    for (const id of existen) if (!principales.includes(id) && !mas.includes(id)) mas.push(id);
    return principales.length ? { secciones, principales, mas } : inicial;
  } catch {
    return inicial;
  }
}

export function guardarDiseno(diseno) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(diseno));
  } catch {
    // Navegación privada: el diseño dura hasta cerrar la página
  }
}

export function borrarDiseno() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}

/** Coloca las tarjetas en el orden del diseño */
export function ordenarSecciones(secciones) {
  const contenedor = document.querySelector('#secciones');
  for (const id of secciones) contenedor.append(contenedor.querySelector(`[data-seccion="${id}"]`));
  actualizarFlechas();
}

/** Solo cuentan las tarjetas que se ven */
const seVe = (elemento) => elemento.getClientRects().length > 0;

/** La primera tarjeta no puede subir y la última no puede bajar */
function actualizarFlechas() {
  const movibles = [...document.querySelectorAll('#secciones > .movible')].filter(seVe);
  movibles.forEach((movible, i) => {
    movible.querySelector('[data-mover="-1"]').disabled = i === 0;
    movible.querySelector('[data-mover="1"]').disabled = i === movibles.length - 1;
  });
}

/** La tarjeta de al lado que se ve (hacia arriba o hacia abajo) */
function vecinaVisible(movible, sube) {
  let vecina = sube ? movible.previousElementSibling : movible.nextElementSibling;
  while (vecina && !seVe(vecina)) vecina = sube ? vecina.previousElementSibling : vecina.nextElementSibling;
  return vecina;
}

/**
 * opciones.obtenerDiseno(): el diseño actual
 * opciones.alCambiarDiseno(diseno, repintarAparatos): se llama tras mover algo
 * opciones.alCambiarModo(editando): para que la app y el panel se enteren
 * opciones.alRestaurar(): botón «Restaurar todo» de la barra flotante
 */
export function iniciarPersonalizar({ obtenerDiseno, alCambiarDiseno, alCambiarModo, alRestaurar }) {
  let activo = false;
  const secciones = document.querySelector('#secciones');
  const zonaAparatos = document.querySelector('[data-seccion="electros"]');

  /** Cada elemento empieza a temblar en un momento distinto, como en el iPhone */
  function refrescarTemblor() {
    for (const elemento of document.querySelectorAll('.movible, .electro-hueco')) {
      elemento.style.setProperty('--retraso', `${-Math.round(Math.random() * 300)}ms`);
    }
  }

  function entrar() {
    if (activo) return;
    activo = true;
    refrescarTemblor();
    document.body.classList.add('editando');
    document.querySelector('#barra-edicion').hidden = false;
    actualizarFlechas();
    alCambiarModo(true);
    navigator.vibrate?.(15);
  }

  function salir() {
    if (!activo) return;
    activo = false;
    document.body.classList.remove('editando');
    document.querySelector('#barra-edicion').hidden = true;
    alCambiarModo(false);
  }

  // Arrastrar las tarjetas (agarrando el asa ⋮⋮)
  hacerOrdenable(secciones, {
    elementos: '.movible',
    asa: '.movible__asa',
    activo: () => activo,
    alTerminar: (lista) => {
      const diseno = obtenerDiseno();
      diseno.secciones = lista.map((elemento) => elemento.dataset.seccion);
      alCambiarDiseno(diseno, false);
      actualizarFlechas();
    },
  });

  // Flechas ↑ ↓ (más fácil con teclado o si arrastrar cuesta)
  secciones.addEventListener('click', (evento) => {
    const boton = evento.target.closest('.movible__boton');
    if (!boton || !activo) return;
    const movible = boton.closest('.movible');
    const sube = Number(boton.dataset.mover) < 0;
    const vecino = vecinaVisible(movible, sube);
    if (!vecino) return;

    // Movemos y animamos las dos tarjetas desde donde estaban (técnica FLIP)
    const antes = [movible, vecino].map((el) => el.getBoundingClientRect().top);
    if (sube) vecino.before(movible);
    else vecino.after(movible);
    [movible, vecino].forEach((el, i) => {
      const distancia = antes[i] - el.getBoundingClientRect().top;
      el.animate([{ transform: `translateY(${distancia}px)` }, { transform: 'none' }], { duration: 320, easing: SUAVE });
    });

    const diseno = obtenerDiseno();
    diseno.secciones = [...secciones.children].map((el) => el.dataset.seccion);
    alCambiarDiseno(diseno, false);
    actualizarFlechas();
    if (boton.disabled) movible.querySelector('.movible__boton:not(:disabled)')?.focus();
  });

  // Arrastrar los aparatos dentro de cada rejilla
  for (const [selector, lista] of [['#electros', 'principales'], ['#electros-mas', 'mas']]) {
    hacerOrdenable(document.querySelector(selector), {
      elementos: '.electro-hueco',
      activo: () => activo,
      alTerminar: (huecos) => {
        const diseno = obtenerDiseno();
        diseno[lista] = huecos.map((hueco) => hueco.dataset.id);
        alCambiarDiseno(diseno, false);
      },
    });
  }

  // Insignias: − pasa el aparato a «Más»; ＋ lo trae a la pantalla principal
  zonaAparatos.addEventListener('click', (evento) => {
    const insignia = evento.target.closest('.electro__insignia');
    if (!insignia || !activo) return;
    const diseno = obtenerDiseno();
    const id = insignia.dataset.id;
    if (insignia.dataset.moverA === 'mas') {
      if (diseno.principales.length <= 1) return; // siempre queda al menos uno
      diseno.principales = diseno.principales.filter((x) => x !== id);
      diseno.mas = [id, ...diseno.mas];
    } else {
      diseno.mas = diseno.mas.filter((x) => x !== id);
      diseno.principales = [...diseno.principales, id];
    }
    navigator.vibrate?.(8);
    alCambiarDiseno(diseno, true);
  });

  // Mantener pulsado un aparato medio segundo también entra en el modo
  let temporizador = null;
  let inicio = null;
  const cancelar = () => {
    clearTimeout(temporizador);
    temporizador = null;
  };
  zonaAparatos.addEventListener('pointerdown', (evento) => {
    if (activo || !evento.target.closest('.electro')) return;
    inicio = { x: evento.clientX, y: evento.clientY };
    temporizador = setTimeout(() => {
      temporizador = null;
      entrar();
    }, 550);
  });
  zonaAparatos.addEventListener('pointermove', (evento) => {
    if (temporizador && Math.hypot(evento.clientX - inicio.x, evento.clientY - inicio.y) > 10) cancelar();
  });
  for (const tipo of ['pointerup', 'pointercancel', 'pointerleave']) zonaAparatos.addEventListener(tipo, cancelar);
  zonaAparatos.addEventListener('contextmenu', (evento) => {
    if (evento.target.closest('.electro')) evento.preventDefault(); // sin menú al mantener pulsado
  });

  // Barra flotante (móvil) y tecla Escape
  document.querySelector('#barra-listo').addEventListener('click', salir);
  document.querySelector('#barra-restaurar').addEventListener('click', alRestaurar);
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && activo && !document.querySelector('#dialogo-restaurar').open) salir();
  });

  return {
    entrar,
    salir,
    alternar: () => (activo ? salir() : entrar()),
    activo: () => activo,
    refrescarTemblor,
  };
}
