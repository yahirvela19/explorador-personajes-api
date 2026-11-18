# Explorador de personajes — Rick and Morty API

Miniaplicación web que consume una API REST pública para buscar, filtrar y consultar personajes. Los datos se obtienen en tiempo real con **Fetch API** y **async/await**, se procesan como **JSON** y se muestran con componentes creados dinámicamente en el DOM.

Actividad 4 — *Miniaplicación web consumiendo una API REST*
Laboratorio de Programación Web · FIME UANL

**Aplicación publicada:** https://yahirvela19.github.io/explorador-personajes-api/

## La API utilizada

[Rick and Morty API](https://rickandmortyapi.com/documentation) es una API REST pública y gratuita con información de los personajes, lugares y episodios de la serie. No requiere registro, clave ni datos personales, y permite peticiones desde el navegador (CORS abierto).

| Dato | Valor |
|---|---|
| URL base | `https://rickandmortyapi.com/api` |
| Formato de respuesta | JSON |
| Autenticación | No requiere |
| Paginación | 20 resultados por página |

### Endpoints utilizados

| Endpoint | Uso en la aplicación |
|---|---|
| `GET /character?page=&name=&status=&species=&gender=` | Lista de personajes con búsqueda, filtros y paginación |
| `GET /character/{id}` | Detalle de un personaje |
| `GET /episode/{id1},{id2},...` | Episodios en los que aparece el personaje (varios en una sola petición) |

### Parámetros de búsqueda

| Parámetro | Valores | Ejemplo |
|---|---|---|
| `page` | Número de página | `page=2` |
| `name` | Texto parcial del nombre | `name=rick` |
| `status` | `alive`, `dead`, `unknown` | `status=dead` |
| `species` | `Human`, `Alien`, `Robot`, … | `species=Human` |
| `gender` | `female`, `male`, `genderless`, `unknown` | `gender=female` |

### Formato de la respuesta

```json
{
  "info": { "count": 107, "pages": 6, "next": "https://rickandmortyapi.com/api/character?page=2&name=rick", "prev": null },
  "results": [
    {
      "id": 1,
      "name": "Rick Sanchez",
      "status": "Alive",
      "species": "Human",
      "gender": "Male",
      "origin": { "name": "Earth (C-137)", "url": "..." },
      "location": { "name": "Citadel of Ricks", "url": "..." },
      "image": "https://rickandmortyapi.com/api/character/avatar/1.jpeg",
      "episode": ["https://rickandmortyapi.com/api/episode/1", "..."]
    }
  ]
}
```

### Códigos de respuesta y cómo se manejan

| Código | Significado | Qué muestra la aplicación |
|---|---|---|
| 200 | Petición correcta | Las tarjetas de los personajes |
| 404 | No hay coincidencias o la página no existe (`{"error":"There is nothing here"}`) | Estado vacío: “No se encontraron personajes” con botón para limpiar filtros |
| 429 | Demasiadas solicitudes | Mensaje para esperar e intentar de nuevo |
| 500 / 503 | Error o indisponibilidad del servidor | Mensaje de error con botón **Reintentar** |
| Sin respuesta | Sin internet o error de red | “No se pudo conectar con la API” con botón **Reintentar** |

## Funcionalidades

- **Búsqueda por nombre** mientras se escribe; espera 400 ms después de la última tecla para no saturar la API.
- **Filtros** por estado, especie y género.
- **Paginación** con botones Anterior / Siguiente y el indicador “Página X de Y”.
- **Detalle** de cada personaje en un diálogo, con la lista de episodios en los que aparece.
- **Estados de carga** con tarjetas de esqueleto y un indicador giratorio en el detalle.
- **Resultado vacío y manejo de errores** con mensajes comprensibles y opción de reintentar.
- **Cancelación de peticiones** con `AbortController`: si el usuario cambia la búsqueda, la petición anterior se cancela para que no aparezcan resultados viejos.
- **Filtros en la URL**: la búsqueda se guarda en la dirección (`?name=rick&status=dead`), así que se puede compartir o recargar sin perderla.
- **Diseño responsivo** para computadora y celular.

## Cómo usarla

1. Abre https://yahirvela19.github.io/explorador-personajes-api/ o clona el repositorio y abre `index.html` en el navegador:
   ```bash
   git clone https://github.com/yahirvela19/explorador-personajes-api.git
   ```
2. Escribe un nombre (por ejemplo *Morty*) o elige un estado, especie o género.
3. Usa **Anterior** y **Siguiente** para recorrer las páginas.
4. Haz clic en una tarjeta para ver el detalle del personaje y sus episodios.
5. **Limpiar** regresa a la lista completa.

No requiere instalación ni servidor propio; solo conexión a internet.

## Estructura del proyecto

```
explorador-personajes-api/
├── index.html      Estructura: filtros, resultados, paginación y diálogo de detalle
├── css/
│   └── styles.css  Estilos y diseño responsivo
├── js/
│   ├── api.js      Acceso a la API: fetch, async/await y manejo de códigos HTTP
│   └── app.js      Interfaz: estado, renderizado en el DOM y eventos
└── README.md
```

La separación entre `api.js` y `app.js` hace que la interfaz no dependa de los detalles de la API: si cambia un endpoint, solo se modifica `api.js`.

## Tecnologías

HTML5, CSS3 (Grid, Flexbox, variables), JavaScript ES6+ (`fetch`, `async/await`, `AbortController`, `URLSearchParams`, clases, funciones flecha, desestructuración), JSON, Git y GitHub Pages.

## Reflexión técnica

Consumir una API externa cambia la forma de programar la interfaz: los datos ya no están disponibles al instante, por lo que cada vista necesita contemplar tres situaciones además del resultado correcto — mientras se espera la respuesta, cuando no hay resultados y cuando algo falla. Revisar la documentación antes de programar fue clave: esta API responde con **404** cuando una búsqueda no tiene coincidencias, así que ese código no debe tratarse como un error del sistema sino como un resultado vacío.

`fetch` solo rechaza la promesa cuando falla la red; un 404 o un 500 llegan como respuestas “exitosas”, por eso se revisa `response.ok` y `response.status` antes de leer el JSON. Otro problema real fue el orden de las respuestas: al escribir rápido, una petición vieja podía terminar después de una nueva y mostrar resultados incorrectos; `AbortController` resolvió esto cancelando la búsqueda anterior. Finalmente, esperar 400 ms después de la última tecla redujo la cantidad de peticiones y evitó llegar al límite de la API.
