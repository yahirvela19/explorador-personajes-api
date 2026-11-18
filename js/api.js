/* =========================================================
   Capa de acceso a la Rick and Morty API
   Documentación: https://rickandmortyapi.com/documentation
   ========================================================= */

'use strict';

const API_BASE = 'https://rickandmortyapi.com/api';

/** Error propio para distinguir los fallos de la API de los de red. */
class ApiError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Hace una petición GET y devuelve el JSON.
 * - 404 significa "sin resultados" para esta API: se devuelve null.
 * - Otros códigos de error lanzan un ApiError con el código HTTP.
 * - Si falla la red (sin internet, CORS, DNS) lanza un ApiError con status 0.
 */
async function obtenerJSON(url, signal) {
  let respuesta;

  try {
    respuesta = await fetch(url, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error; // petición cancelada a propósito
    throw new ApiError('No se pudo conectar con la API. Revisa tu conexión a internet.', 0);
  }

  if (respuesta.status === 404) return null;

  if (!respuesta.ok) {
    const mensajes = {
      429: 'La API recibió demasiadas solicitudes. Espera unos segundos e intenta de nuevo.',
      500: 'La API tuvo un error interno. Intenta más tarde.',
      503: 'La API no está disponible en este momento.',
    };
    throw new ApiError(mensajes[respuesta.status] ?? `La API respondió con el código ${respuesta.status}.`,
                       respuesta.status);
  }

  return respuesta.json();
}

/**
 * GET /character con filtros y página.
 * Parámetros admitidos: page, name, status, species, gender.
 * Respuesta: { info: { count, pages, next, prev }, results: [ ...personajes ] }
 */
async function buscarPersonajes({ page = 1, name = '', status = '', species = '', gender = '' } = {}, signal) {
  const parametros = new URLSearchParams({ page });

  Object.entries({ name, status, species, gender })
    .filter(([, valor]) => valor !== '')
    .forEach(([clave, valor]) => parametros.append(clave, valor));

  const datos = await obtenerJSON(`${API_BASE}/character?${parametros}`, signal);

  // la API responde 404 cuando no hay coincidencias: se normaliza a una lista vacía
  return datos ?? { info: { count: 0, pages: 0, next: null, prev: null }, results: [] };
}

/** GET /character/{id} — un solo personaje. */
async function obtenerPersonaje(id, signal) {
  const personaje = await obtenerJSON(`${API_BASE}/character/${id}`, signal);
  if (!personaje) throw new ApiError('El personaje no existe.', 404);
  return personaje;
}

/**
 * GET /episode/{ids} — varios episodios en una sola petición.
 * La API devuelve un objeto si se pide un id y un arreglo si se piden varios.
 */
async function obtenerEpisodios(urls, signal) {
  const ids = urls.map((url) => url.split('/').pop());
  if (ids.length === 0) return [];

  const datos = await obtenerJSON(`${API_BASE}/episode/${ids.join(',')}`, signal);
  if (!datos) return [];
  return Array.isArray(datos) ? datos : [datos];
}
