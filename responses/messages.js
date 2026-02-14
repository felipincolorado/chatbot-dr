// responses/messages.js

const AGENDA_URL = 'https://drsebastianaravena.cl/agendar/';
const HUMAN_WA_BASE = 'https://wa.me/56926125661';

const menuBase =
  'Responde con un número:\n' +
  '1️⃣ Licencia\n' +
  '2️⃣ Valores\n' +
  '3️⃣ Agendar\n' +
  '4️⃣ Soporte pacientes\n' +
  '0️⃣ Menú';

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
    'Hola, necesito ayuda.',
    `RUT: ${rut}`,
    `Motivo: ${motive}`,
  ];

  if (safeDetail) lines.push(`Detalle: ${safeDetail}`);

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
    'Fonasa: $35.000\n' +
    'Particular/Isapre: $45.000\n\n' +
    '3 agendar · 0 menú',

  opcion3:
    `Agenda aquí:\n${AGENDA_URL}\n` +
    'La disponibilidad es la que aparece en la agenda.\n\n' +
    '0 menú',

  sobrecupo:
    'La disponibilidad es la que aparece al agendar.\n' +
    'Si ya eres paciente y es un caso especial, presiona 4 (Soporte pacientes).\n' +
    'Para agendar: 3.\n\n' +
    '0 menú',

  soporte_intro:
    'Soporte pacientes (solo si ya te atendiste o tienes reserva).\n' +
    'Para enviar tu caso al equipo, completa estos datos.',

  soporte_rut:
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

  soporte_fin: (link) =>
    'Abre este link para escribir por WhatsApp soporte:\n' +
    link +
    '\n\n' +
    '0 menú',

  gracias: 'De nada. 0 menú',

  error:
    'No entendí.\n' +
    'Responde con 1, 2, 3, 4 o 0.',
};
