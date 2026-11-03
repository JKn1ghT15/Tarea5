// ===== Configuración =====
const BASE_URL = 'https://api.fifa.com/api/v3';
const IDIOMA = 'es';
const PAIS = 'MEX';

// Cada consulta puede tener una función "procesar" para transformar la respuesta
const CONSULTAS = [
  {
    grupo: 'Partidos',
    titulo: 'Todos los partidos del Grupo A',
    descripcion: 'Calendario completo del Grupo A con marcadores, fechas y estadios.',
    url: `${BASE_URL}/calendar/matches?idCompetition=17&idSeason=285023&idGroup=289275&language=${IDIOMA}`
  },
  {
    grupo: 'Partidos',
    titulo: 'Partidos de México',
    descripcion: 'Solo los partidos del Grupo A donde participa México (filtrado en el navegador).',
    url: `${BASE_URL}/calendar/matches?idCompetition=17&idSeason=285023&idGroup=289275&language=${IDIOMA}`,
    procesar: (data) =>
      data.Results.filter(
        (p) => p.Home?.IdCountry === PAIS || p.Away?.IdCountry === PAIS
      )
  },
  {
    grupo: 'Partidos',
    titulo: 'Resumen de México',
    descripcion: 'Versión corta: local, visitante, marcador, fecha y estadio de cada partido de México.',
    url: `${BASE_URL}/calendar/matches?idCompetition=17&idSeason=285023&idGroup=289275&language=${IDIOMA}`,
    procesar: (data) =>
      data.Results
        .filter((p) => p.Home?.IdCountry === PAIS || p.Away?.IdCountry === PAIS)
        .map((p) => ({
          idPartido: p.IdMatch,
          local: texto(p.Home?.TeamName),
          visitante: texto(p.Away?.TeamName),
          marcador: `${p.Home?.Score ?? 0} - ${p.Away?.Score ?? 0}`,
          fecha: new Date(p.Date).toLocaleString('es-MX'),
          estadio: texto(p.Stadium?.Name)
        }))
  },
  {
    grupo: 'Detalle de partido',
    titulo: 'Línea de tiempo de un partido',
    descripcion: 'Goles, tarjetas y demás eventos. Reemplaza ID_PARTIDO por el IdMatch (lo obtienes en "Resumen de México").',
    url: `${BASE_URL}/timelines/ID_PARTIDO?language=${IDIOMA}`
  },
  {
    grupo: 'Torneo',
    titulo: 'Información de la competición',
    descripcion: 'Datos generales de la competición (idCompetition=17).',
    url: `${BASE_URL}/competitions/17?language=${IDIOMA}`
  },
  {
    grupo: 'Torneo',
    titulo: 'Información de la temporada',
    descripcion: 'Datos generales de la temporada (idSeason=285023).',
    url: `${BASE_URL}/seasons/285023?language=${IDIOMA}`
  }
];

// ===== Elementos del DOM =====
const listaConsultas = document.getElementById('requestList');
const tituloEl = document.getElementById('requestTitle');
const descripcionEl = document.getElementById('requestDescription');
const urlInput = document.getElementById('endpointUrl');
const botonEjecutar = document.getElementById('runRequest');
const estadoEl = document.getElementById('responseStatus');
const salidaEl = document.getElementById('responseOutput');

let consultaActual = null;

// ===== Utilidades =====
function texto(valor) {
  return Array.isArray(valor) ? (valor[0]?.Description ?? '') : (valor ?? '');
}

function mostrarEstado(mensaje) {
  estadoEl.textContent = mensaje;
}

// ===== Lista de consultas =====
function dibujarConsultas() {
  listaConsultas.innerHTML = '';
  let grupoAnterior = null;

  CONSULTAS.forEach((consulta, indice) => {
    if (consulta.grupo !== grupoAnterior) {
      const encabezado = document.createElement('h3');
      encabezado.textContent = consulta.grupo;
      listaConsultas.appendChild(encabezado);
      grupoAnterior = consulta.grupo;
    }

    const boton = document.createElement('button');
    boton.textContent = consulta.titulo;
    boton.dataset.indice = indice;
    boton.addEventListener('click', () => seleccionarConsulta(indice));
    listaConsultas.appendChild(boton);
  });
}

function seleccionarConsulta(indice) {
  consultaActual = CONSULTAS[indice];

  tituloEl.textContent = consultaActual.titulo;
  descripcionEl.textContent = consultaActual.descripcion;
  urlInput.value = consultaActual.url;
  botonEjecutar.disabled = false;

  mostrarEstado('Sin ejecutar');
  salidaEl.textContent = 'Aquí aparecerán los datos de la consulta.';
}

// ===== Ejecutar consulta =====
async function ejecutarConsulta() {
  const url = urlInput.value.trim();

  if (!url) {
    mostrarEstado('Escribe una URL antes de ejecutar.');
    return;
  }
  if (url.includes('ID_PARTIDO')) {
    mostrarEstado('Reemplaza ID_PARTIDO por el IdMatch de un partido.');
    return;
  }

  botonEjecutar.disabled = true;
  mostrarEstado('Cargando...');
  salidaEl.textContent = '';
  const inicio = performance.now();

  try {
    const respuesta = await fetch(url);
    const duracion = Math.round(performance.now() - inicio);

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status} ${respuesta.statusText}`);
    }

    let data = await respuesta.json();

    // Solo se transforma si la URL no fue modificada por el usuario
    if (consultaActual?.procesar && url === consultaActual.url) {
      data = consultaActual.procesar(data);
    }

    const cantidad = Array.isArray(data) ? ` | ${data.length} resultados` : '';
    mostrarEstado(`OK (${respuesta.status}) | ${duracion} ms${cantidad}`);
    salidaEl.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    mostrarEstado(`Error: ${error.message}`);
    salidaEl.textContent = 'No se pudo obtener la información.';
  } finally {
    botonEjecutar.disabled = false;
  }
}

// ===== Inicio =====
botonEjecutar.addEventListener('click', ejecutarConsulta);
dibujarConsultas();