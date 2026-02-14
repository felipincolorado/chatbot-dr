// responses/messages.js

const AGENDA_URL = 'https://drsebastianaravena.cl/agendar/';
const HUMAN_WA_BASE = 'https://wa.me/56926125661';

const menuBase = [
  'Responde con un número:',
  '1️⃣ Licencia',
  '2️⃣ Valores',
  '3️⃣ Agendar',
  '4️⃣ Soporte pacientes',
  '0️⃣ Menú',
].join('\n');

function stripAccents(str) {
  try {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return str;
  }
}

function normalizeRut(input) {
  const raw = stripAccents(String(input || ''))
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s/g, '');

  // 12345678-9 o 123456789
  if (/^\d{7,8}-[\dk]$/.test(raw)) return raw;
  if (/^\d{8,9}$/.test(raw)) return raw.slice(0, -1) + '-' + raw.slice(-1);
  return null;
}

function buildSupportLink({ rut, motive, detail }) {
  const safeDetail = String(detail || '').trim().slice(0, 220);

  const lines = [
    'Hola, mi situación es:',
    `RUT: ${rut}`,
    `Motivo: ${motive}`,
  ];

  // Si no hay detalle, dejamos "Detalle:" para que lo completen al abrir WhatsApp.
  if (safeDetail) lines.push(`Detalle: ${safeDetail}`);
  else lines.push('Detalle:');

  const text = lines.join('\n');
  return `${HUMAN_WA_BASE}?text=${encodeURIComponent(text)}`;
}

module.exports = {
  // helpers exportados para index.js
  normalizeRut,
  buildSupportLink,

  bienvenida:
    `Hola, soy Miriam 👩‍💼, asistente virtual del Dr. Sebastián Aravena.\n\n${menuBase}`,

  menuConHeader:
    `Opciones:\n\n${menuBase}`,

  opcion1:
    'La licencia médica no se vende. Se define solo en consulta, según evaluación.\n' +
    'En salud mental, muchas veces el reposo sí es necesario; se evalúa sin juicio.\n' +
    'Si corresponde, el médico puede emitir hasta 14 días por teleconsulta (renovable si se necesita).\n\n' +
    '3 agendar · 0 menú',

  opcion2:
    'Valores (precio único por atención completa):\n' +
    'Fonasa/Dipreca: $35.000\n' +
    'Isapre: $45.000\n' +
    'No hay cobros adicionales por licencia/receta/certificado (si corresponde).\n\n' +
    '3 agendar · 0 menú',

  opcion3:
    `Agenda y paga en la web:\n${AGENDA_URL}\n` +
    'Al finalizar te llegará un correo con el enlace de acceso a la teleconsulta.\n\n' +
    '0 menú',

  sobrecupo:
    'La agenda disponible es la que aparece al agendar.\n' +
    'Si ya eres paciente y es un caso especial, presiona 4 (Soporte pacientes).\n' +
    'Para agendar: 3.\n\n' +
    '0 menú',

  soporte_inicio:
    'Soporte pacientes (solo si ya te atendiste o tienes reserva).\n' +
    'Envía tu RUT (sin puntos y con guion). Ej: 12345678-9',

  soporte_rut_invalido:
    'RUT inválido. Ejemplo: 12345678-9\n' +
    'Vuelve a enviarlo.',

  soporte_motivo:
    'Motivo:\n' +
    '1 Licencia rechazada\n' +
    '2 Reembolso / Reprogramar\n' +
    '3 Problemas al agendar\n' +
    '4 Otro',

  soporte_detalle:
    'Escribe el detalle en 1 frase (sin datos médicos).',

  // Para maximizar que WhatsApp muestre la previsualización/botón, devolvemos SOLO el link.
  soporte_fin: (link) => link,

  gracias: 'De nada. 0 menú',

  error:
    'No entendí.\n' +
    'Responde con 1, 2, 3, 4 o 0.',
};
