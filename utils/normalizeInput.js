// utils/normalizeInput.js

function stripAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function clean(text) {
  return stripAccents(text)
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

  // números
  if (t === '1' || t === '2' || t === '3' || t === '4') return t;
  if (t === '0' || t === 'menu' || t === 'menú' || t === 'volver') return '0';

  // keywords
  if (hasAny(t, ['sobrecupo', 'sobre cupo', 'urgente', 'hoy', 'ahora'])) return 'sobrecupo';
  if (hasAny(t, ['licencia', 'reposo', '14'])) return '1';
  if (hasAny(t, ['valor', 'precio', 'costo', 'fonasa', 'isapre', 'particular'])) return '2';
  if (hasAny(t, ['agendar', 'agenda', 'hora', 'cita', 'reservar'])) return '3';
  if (hasAny(t, ['soporte', 'paciente', 'problema', 'error', 'rechazada', 'reembolso', 'reprogram'])) return '4';
  if (hasAny(t, ['gracias', 'muchas gracias'])) return 'gracias';

  return null;
};
