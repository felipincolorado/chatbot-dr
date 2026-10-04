// src/normalizeInput.js
// Reconocimiento determinista de intenciones. Devuelve una clave de intención
// o null. El orden de las reglas importa: seguridad primero.

function stripAccents(str) {
  return String(str || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function clean(text) {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Coincidencia por palabra/frase completa (evita que "ahora" active "hora").
function has(t, phrases) {
  const padded = ` ${t} `;
  return phrases.some((p) => padded.includes(` ${p} `));
}

// Coincidencia por prefijo de palabra (ej. "agend" -> agendar, agendo, agenda).
function hasPrefix(t, prefixes) {
  const words = t.split(' ');
  return prefixes.some((p) => words.some((w) => w.startsWith(p)));
}

const NUMBERS = {
  0: '0', cero: '0',
  1: '1', uno: '1',
  2: '2', dos: '2',
  3: '3', tres: '3',
  4: '4', cuatro: '4',
  5: '5', cinco: '5',
};

const INTENT_BY_NUMBER = {
  0: 'menu',
  1: 'agendar',
  2: 'valores',
  3: 'como_funciona',
  4: 'licencias',
  5: 'paciente',
};

function selectedNumber(text) {
  const t = clean(text).replace(/[*]/g, '').trim();
  return NUMBERS[t] || null;
}

function detectIntent(text) {
  const t = clean(text);
  if (!t) return null;

  const num = selectedNumber(text);
  if (num) return INTENT_BY_NUMBER[num];

  // Seguridad: riesgo vital tiene prioridad absoluta.
  if (
    hasPrefix(t, ['suicid', 'autolesi']) ||
    has(t, ['matarme', 'quitarme la vida', 'no quiero vivir', 'hacerme dano', 'cortarme', 'morirme'])
  ) {
    return 'crisis';
  }
  if (hasPrefix(t, ['urgenc', 'emergenc']) || has(t, ['urgente'])) return 'urgencia';

  if (has(t, ['menu', 'volver', 'inicio', 'opciones'])) return 'menu';

  if (
    has(t, ['ya soy paciente', 'soy paciente', 'ya me atendi', 'no me llego', 'no llego', 'no recibi']) ||
    hasPrefix(t, ['reembols', 'reprogram', 'devoluci', 'cancel', 'soporte', 'problema'])
  ) {
    return 'paciente';
  }

  if (hasPrefix(t, ['licencia', 'reposo', 'compin'])) return 'licencias';

  if (hasPrefix(t, ['receta', 'certificad', 'orden', 'informe'])) return 'documentos';

  if (
    hasPrefix(t, ['valor', 'precio', 'costo', 'cuest', 'cobr', 'fonasa', 'isapre', 'dipreca', 'arancel', 'tarifa']) ||
    has(t, ['cuanto', 'cuanto sale', 'cuanto vale'])
  ) {
    return 'valores';
  }

  if (
    has(t, ['como funciona', 'como es la consulta', 'es online', 'es presencial', 'en linea']) ||
    hasPrefix(t, ['videollamad', 'telemedic', 'teleconsult', 'presencial', 'online', 'zoom', 'meet'])
  ) {
    return 'como_funciona';
  }

  if (has(t, ['sobrecupo', 'sobre cupo', 'hoy mismo'])) return 'sobrecupo';

  if (hasPrefix(t, ['agend', 'reserv', 'cita']) || has(t, ['hora', 'horas', 'horario', 'horarios', 'disponibilidad'])) {
    return 'agendar';
  }

  // Contenido clínico: no se procesa ni se envía a IA.
  if (
    hasPrefix(t, [
      'sintom', 'diagnost', 'medicament', 'remedio', 'pastilla', 'dosis', 'tratamient',
      'dolor', 'fiebre', 'ansiedad', 'depresi', 'insomnio', 'antidepres', 'enferm',
    ])
  ) {
    return 'clinico';
  }

  if (has(t, ['humano', 'persona', 'ejecutiva', 'ejecutivo', 'secretaria', 'hablar con alguien', 'recepcion'])) {
    return 'humano';
  }

  if (hasPrefix(t, ['gracias', 'grax', 'agradec'])) return 'gracias';
  if (has(t, ['chao', 'adios', 'hasta luego', 'nos vemos'])) return 'despedida';

  if (
    has(t, ['hola', 'ola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'alo', 'saludos', 'info', 'informacion']) ||
    hasPrefix(t, ['holi', 'holaa'])
  ) {
    return 'saludo';
  }

  return null;
}

module.exports = { detectIntent, selectedNumber, clean };
