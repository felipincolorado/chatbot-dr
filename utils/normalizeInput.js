module.exports = function normalizeInput(text) {
  const cleaned = text.toLowerCase().trim().replace(/[^\w\s]/gi, '');

  if (['1', 'uno', 'teleconsulta'].includes(cleaned)) return '1';
  if (['2', 'dos', 'agendar', 'hora', 'agenda'].includes(cleaned)) return '2';
  if (['3', 'tres', 'precio', 'pago', 'valor', 'valores'].includes(cleaned)) return '3';
  if (['4', 'cuatro', 'humano', 'asistente', 'hablar'].includes(cleaned)) return '4';
  if (['0', 'menu', 'menú', 'volver'].includes(cleaned)) return '0';
  if (['gracias', 'muchas gracias', 'grac'].includes(cleaned)) return 'gracias';

  return null;
}
