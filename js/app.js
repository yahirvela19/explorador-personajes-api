/* =========================================================
   Explorador de personajes — interfaz
   Usa las funciones de api.js para consultar la API y
   construye la página dinámicamente con el DOM.
   ========================================================= */

'use strict';

// ---------------------------------------------------------
// 1. Estado y referencias al DOM
// ---------------------------------------------------------
const estado = { page: 1, name: '', status: '', species: '', gender: '' };
let controlador = null;        // AbortController de la búsqueda en curso
let controladorDetalle = null; // AbortController del detalle abierto
let temporizador = null;       // para esperar a que el usuario termine de escribir

const $ = (selector) => document.querySelector(selector);

const ui = {
  form: $('#form-filtros'),
  nombre: $('#filtro-nombre'),
  status: $('#filtro-estado'),
  species: $('#filtro-especie'),
  gender: $('#filtro-genero'),
  limpiar: $('#btn-limpiar'),
  lista: $('#lista'),
  estado: $('#estado'),
  resumen: $('#resumen'),
  paginaInfo: $('#pagina-info'),
  anterior: $('#btn-anterior'),
  siguiente: $('#btn-siguiente'),
  detalle: $('#detalle'),
  detalleTitulo: $('#detalle-titulo'),
  detalleContenido: $('#detalle-contenido'),
  cerrar: $('#btn-cerrar'),
};

const TRADUCCION = {
  status: { Alive: 'Vivo', Dead: 'Muerto', unknown: 'Desconocido' },
  gender: { Female: 'Femenino', Male: 'Masculino', Genderless: 'Sin género', unknown: 'Desconocido' },
  species: { Human: 'Humano', Alien: 'Alienígena', Humanoid: 'Humanoide', Animal: 'Animal',
             'Mythological Creature': 'Criatura mitológica', Disease: 'Enfermedad', unknown: 'Desconocida' },
};

const traducir = (tipo, valor) => TRADUCCION[tipo][valor] ?? valor;

// ---------------------------------------------------------
// 2. Utilidades para crear elementos
// ---------------------------------------------------------
function crear(etiqueta, { clase, texto, atributos = {} } = {}, hijos = []) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  Object.entries(atributos).forEach(([nombre, valor]) => elemento.setAttribute(nombre, valor));
  elemento.append(...hijos);
  return elemento;
}

function indicadorEstado(status) {
  const clase = { Alive: 'status--alive', Dead: 'status--dead' }[status] ?? '';
  return crear('span', { clase: `status ${clase}` }, [
    crear('span', { clase: 'status__dot', atributos: { 'aria-hidden': 'true' } }),
    traducir('status', status),
  ]);
}

// ---------------------------------------------------------
// 3. Estados de la interfaz: carga, vacío, error
// ---------------------------------------------------------
function mostrarCarga() {
  ui.estado.hidden = true;
  const esqueletos = Array.from({ length: 8 }, () =>
    crear('div', { clase: 'skeleton', atributos: { 'aria-hidden': 'true' } }, [
      crear('div', { clase: 'skeleton__img' }),
      crear('div', { clase: 'skeleton__line' }),
      crear('div', { clase: 'skeleton__line skeleton__line--short' }),
    ])
  );
  ui.lista.replaceChildren(...esqueletos);
  ui.resumen.textContent = 'Cargando personajes…';
}

function mostrarVacio() {
  ui.lista.replaceChildren();
  ui.estado.className = 'state';
  ui.estado.replaceChildren(
    crear('p', { clase: 'state__title', texto: 'No se encontraron personajes' }),
    crear('p', { clase: 'muted', texto: 'Prueba con otro nombre o quita algunos filtros.' }),
    crear('button', { clase: 'btn btn--ghost', texto: 'Limpiar filtros', atributos: { type: 'button', 'data-accion': 'limpiar' } })
  );
  ui.estado.hidden = false;
  ui.resumen.textContent = '0 personajes encontrados';
}

function mostrarError(error) {
  ui.lista.replaceChildren();
  ui.estado.className = 'state state--error';
  ui.estado.replaceChildren(
    crear('p', { clase: 'state__title', texto: 'No se pudieron cargar los personajes' }),
    crear('p', { clase: 'muted', texto: error.message }),
    crear('button', { clase: 'btn btn--ghost', texto: 'Reintentar', atributos: { type: 'button', 'data-accion': 'reintentar' } })
  );
  ui.estado.hidden = false;
  ui.resumen.textContent = 'Error al consultar la API';
}

// ---------------------------------------------------------
// 4. Renderizado de resultados
// ---------------------------------------------------------
function crearTarjeta(personaje) {
  const tarjeta = crear('button', { clase: 'card-item', atributos: { type: 'button', 'data-id': personaje.id } }, [
    crear('img', { clase: 'card-item__img', atributos: { src: personaje.image, alt: personaje.name, loading: 'lazy' } }),
    crear('div', { clase: 'card-item__body' }, [
      indicadorEstado(personaje.status),
      crear('h3', { clase: 'card-item__name', texto: personaje.name }),
      crear('p', { clase: 'card-item__meta' }, [
        `${traducir('species', personaje.species)} · ${traducir('gender', personaje.gender)}`,
      ]),
      crear('p', { clase: 'card-item__meta' }, [
        'Ubicación: ', crear('strong', { texto: personaje.location.name }),
      ]),
    ]),
  ]);
  return tarjeta;
}

function renderResultados({ info, results }) {
  if (results.length === 0) {
    mostrarVacio();
    actualizarPaginacion(0);
    return;
  }

  ui.estado.hidden = true;
  ui.lista.replaceChildren(...results.map(crearTarjeta));
  ui.resumen.textContent = `${info.count.toLocaleString('es-MX')} personajes encontrados`;
  actualizarPaginacion(info.pages);
}

function actualizarPaginacion(totalPaginas) {
  ui.paginaInfo.textContent = totalPaginas > 0 ? `Página ${estado.page} de ${totalPaginas}` : 'Sin páginas';
  ui.anterior.disabled = estado.page <= 1;
  ui.siguiente.disabled = estado.page >= totalPaginas;
}

// ---------------------------------------------------------
// 5. Consulta principal
// ---------------------------------------------------------
async function cargarPersonajes() {
  controlador?.abort();               // cancela la búsqueda anterior si sigue en curso
  controlador = new AbortController();

  guardarEnURL();
  mostrarCarga();

  try {
    const datos = await buscarPersonajes(estado, controlador.signal);
    renderResultados(datos);
  } catch (error) {
    if (error.name === 'AbortError') return; // fue reemplazada por una búsqueda más reciente
    mostrarError(error);
    actualizarPaginacion(0);
  }
}

// ---------------------------------------------------------
// 6. Detalle del personaje
// ---------------------------------------------------------
async function abrirDetalle(id) {
  controladorDetalle?.abort();
  controladorDetalle = new AbortController();

  ui.detalleTitulo.textContent = 'Cargando…';
  ui.detalleContenido.replaceChildren(
    crear('div', { clase: 'state' }, [crear('div', { clase: 'spinner' }), crear('p', { clase: 'muted', texto: 'Consultando la API…' })])
  );
  ui.detalle.showModal();

  try {
    const personaje = await obtenerPersonaje(id, controladorDetalle.signal);
    const episodios = await obtenerEpisodios(personaje.episode, controladorDetalle.signal);
    renderDetalle(personaje, episodios);
  } catch (error) {
    if (error.name === 'AbortError') return;
    ui.detalleTitulo.textContent = 'Error';
    ui.detalleContenido.replaceChildren(
      crear('div', { clase: 'state state--error' }, [
        crear('p', { clase: 'state__title', texto: 'No se pudo cargar el detalle' }),
        crear('p', { clase: 'muted', texto: error.message }),
      ])
    );
  }
}

function renderDetalle(personaje, episodios) {
  ui.detalleTitulo.textContent = personaje.name;

  const datos = [
    ['Estado', traducir('status', personaje.status)],
    ['Especie', traducir('species', personaje.species)],
    ['Tipo', personaje.type || '—'],
    ['Género', traducir('gender', personaje.gender)],
    ['Origen', personaje.origin.name],
    ['Ubicación', personaje.location.name],
    ['Episodios', personaje.episode.length],
    ['Registrado', new Date(personaje.created).toLocaleDateString('es-MX')],
  ];

  const lista = crear('dl', { clase: 'detail__list' },
    datos.flatMap(([etiqueta, valor]) => [crear('dt', { texto: etiqueta }), crear('dd', { texto: String(valor) })]));

  const filasEpisodios = episodios.map((ep) =>
    crear('li', {}, [crear('span', { texto: ep.name }), crear('span', { clase: 'code', texto: `${ep.episode} · ${ep.air_date}` })])
  );

  ui.detalleContenido.replaceChildren(
    crear('div', { clase: 'detail' }, [
      crear('img', { clase: 'detail__img', atributos: { src: personaje.image, alt: personaje.name } }),
      lista,
    ]),
    crear('div', { clase: 'episodes' }, [
      crear('h3', { texto: `Aparece en ${episodios.length} episodio${episodios.length === 1 ? '' : 's'}` }),
      crear('ul', {}, filasEpisodios),
    ])
  );
}

// ---------------------------------------------------------
// 7. Sincronizar filtros con la URL (se puede compartir el enlace)
// ---------------------------------------------------------
function guardarEnURL() {
  const parametros = new URLSearchParams(
    Object.entries(estado).filter(([clave, valor]) => valor !== '' && !(clave === 'page' && valor === 1))
  );
  const consulta = parametros.toString();
  history.replaceState(null, '', consulta ? `?${consulta}` : location.pathname);
}

function leerDeURL() {
  const parametros = new URLSearchParams(location.search);
  estado.name = parametros.get('name') ?? '';
  estado.status = parametros.get('status') ?? '';
  estado.species = parametros.get('species') ?? '';
  estado.gender = parametros.get('gender') ?? '';
  estado.page = Math.max(1, Number.parseInt(parametros.get('page'), 10) || 1);

  ui.nombre.value = estado.name;
  ui.status.value = estado.status;
  ui.species.value = estado.species;
  ui.gender.value = estado.gender;
}

function limpiarFiltros() {
  Object.assign(estado, { page: 1, name: '', status: '', species: '', gender: '' });
  ui.form.reset();
  cargarPersonajes();
}

// ---------------------------------------------------------
// 8. Eventos
// ---------------------------------------------------------
ui.form.addEventListener('submit', (e) => e.preventDefault());

// búsqueda por nombre: espera 400 ms después de la última tecla
ui.nombre.addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    estado.name = ui.nombre.value.trim();
    estado.page = 1;
    cargarPersonajes();
  }, 400);
});

// filtros: cada cambio reinicia en la página 1
[['status', ui.status], ['species', ui.species], ['gender', ui.gender]].forEach(([clave, select]) => {
  select.addEventListener('change', () => {
    estado[clave] = select.value;
    estado.page = 1;
    cargarPersonajes();
  });
});

ui.limpiar.addEventListener('click', limpiarFiltros);

ui.anterior.addEventListener('click', () => { estado.page -= 1; cargarPersonajes(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
ui.siguiente.addEventListener('click', () => { estado.page += 1; cargarPersonajes(); window.scrollTo({ top: 0, behavior: 'smooth' }); });

// selección de un personaje (delegación de eventos)
ui.lista.addEventListener('click', (e) => {
  const tarjeta = e.target.closest('.card-item');
  if (tarjeta) abrirDetalle(tarjeta.dataset.id);
});

// botones de los estados vacío y error
ui.estado.addEventListener('click', (e) => {
  const accion = e.target.closest('button')?.dataset.accion;
  if (accion === 'reintentar') cargarPersonajes();
  if (accion === 'limpiar') limpiarFiltros();
});

ui.cerrar.addEventListener('click', () => ui.detalle.close());
ui.detalle.addEventListener('click', (e) => { if (e.target === ui.detalle) ui.detalle.close(); }); // clic fuera
ui.detalle.addEventListener('close', () => controladorDetalle?.abort());

// ---------------------------------------------------------
// 9. Inicio
// ---------------------------------------------------------
leerDeURL();
cargarPersonajes();
