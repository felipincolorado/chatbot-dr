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
  const safeDetail = String(detail || '').trim().slice(0, 260);

  // Texto precargado (natural, sin “soy paciente”)
  const lines = [
    'Hola, mi situación es:',
    `RUT: ${rut}`,
    `Motivo: ${motive}`,
  ];

  // Si no hay detalle, igual dejamos el campo para que la persona complete
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

  // Valores: precio único (sin cobros extra) + ajuste Fonasa/Dipreca vs Isapre
  opcion2:
    'Fonasa/Dipreca: $35.000\n' +
    'Isapre: $45.000\n\n' +
    'Precio único por la atención completa.\n' +
    'No hay cobros extra por licencia/receta/certificados (si corresponde).\n\n' +
    '3 agendar · 0 menú',

  // Agendar: todo en la web + correo con enlace
  opcion3:
    `Agenda y paga en el sitio web:\n${AGENDA_URL}\n\n` +
    'Al finalizar te llegará un correo con tu enlace de acceso a la teleconsulta.\n\n' +
    '0 menú',

  // Sobrecupo: suave + deriva a 4 si paciente
  sobrecupo:
    'La agenda disponible es la que aparece al agendar.\n' +
    'Si ya eres paciente y es un caso especial, presiona 4 (Soporte pacientes).\n\n' +
    '3 agendar · 0 menú',

  // Soporte: un solo mensaje de entrada (evita “al revés”)
  soporte_inicio:
    'Soporte pacientes (solo si ya te atendiste o tienes reserva).\n' +
    'Para derivarte a WhatsApp soporte, envía tu RUT (sin puntos y con guion).\n' +
    'Ej: 12345678-9',

  soporte_rut_invalido:
    'RUT inválido. Ejemplo: 12345678-9\n' +
    'Vuelve a enviarlo.',

  soporte_motivo:
    'Motivo:\n' +
    '1 Licencia rechazada\n' +
    '2 Reembolso / Reprogramar\n' +
    '3 Problemas al agendar\n' +
    '4 Otro',

  soporte_detalle_otro:
    'Escribe el detalle en 1 frase (sin datos médicos).',

  // Mensaje previo antes de mandar el link (para que no parezca virus)
  soporte_derivacion_prev:
    'Listo. En 2 segundos te llegará el botón para “Iniciar chat” en WhatsApp soporte.',

  gracias: 'De nada. 0 menú',

  error:
    'No entendí.\n' +
    'Responde con 1, 2, 3, 4 o 0.',
};
