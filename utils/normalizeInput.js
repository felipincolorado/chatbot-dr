function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function clean(text) {
  return stripAccents(String(text || ''))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(t, words) {
  return words.some((w) => t.includes(w));
}

module.exports = function normalizeInput(text) {
  const t = clean(text);

  if (!t) return null;

  // números directos
  if (t === '1' || t === 'uno') return '1';
  if (t === '2' || t === 'dos') return '2';
  if (t === '3' || t === 'tres') return '3';
  if (t === '4' || t === 'cuatro') return '4';
  if (t === '0' || t === 'menu' || t === 'volver') return '0';

  if (hasAny(t, ['sobrecupo', 'sobre cupo', 'urgente', 'hoy', 'ahora'])) return 'sobrecupo';

  // palabras clave → deriva a menú
  if (hasAny(t, ['licencia', 'reposo', 'compin', 'isapre', 'rechazada'])) return '1';
  if (hasAny(t, ['valor', 'precio', 'costo', 'fonasa', 'particular'])) return '2';
  if (hasAny(t, ['agendar', 'agenda', 'hora', 'cita', 'reservar'])) return '3';
  if (hasAny(t, ['soporte', 'paciente', 'problema', 'error', 'reembolso', 'reprogramar'])) return '4';

  if (hasAny(t, ['gracias', 'muchas gracias'])) return 'gracias';

  return null;
}
