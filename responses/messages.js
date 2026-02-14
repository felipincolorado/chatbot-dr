// responses/messages.js

const AGENDA_URL = 'https://drsebastianaravena.cl/agendar/';
const HUMAN_WA_BASE = 'https://wa.me/56926125661';

const menuBase =
  'Responde con un número:\n\n' +
  '1️⃣ Licencia\n' +
  '2️⃣ Valores\n' +
  '3️⃣ Agendar\n' +
  '4️⃣ Soporte pacientes\n\n' +
  '0️⃣ Menú\n\n' +
  'No hay sobrecupo.';

function buildHumanWaLink({ rut, motive, detail }) {
  const safeDetail = String(detail || '').trim().slice(0, 240);

  const text =
    'Hola. Soy paciente del Dr. Sebastián Aravena.\n' +
    `RUT: ${rut}\n` +
    `Motivo: ${motive}\n` +
    `Detalle: ${safeDetail}`;

  return `${HUMAN_WA_BASE}?text=${encodeURIComponent(text)}`;
}

module.exports = {
  bienvenida:
    `Hola, soy Miriam 👩‍💼, asistente virtual del Dr. Sebastián Aravena.\n\n${menuBase}`,

  menu: menuBase,

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
    `Agenda aquí:\n${AGENDA_URL}\n\n0 menú`,

  sobrecupo:
    'No hay sobrecupo.\n' +
    'Si ya eres paciente y es un caso especial, presiona 4 (Soporte pacientes).\n' +
    'Para agendar: 3.',

  soporte_rut:
    'Soporte pacientes (solo si ya te atendiste o tienes reserva).\n' +
    'Envía tu RUT (sin puntos y con guion).',

  soporte_motivo:
    'Motivo:\n' +
    '1 Licencia rechazada\n' +
    '2 Reembolso / Reprogramar\n' +
    '3 Problemas al agendar\n' +
    '4 Otro',

  soporte_detalle:
    'Detalle en 1 frase (sin datos médicos).',

  soporte_fin: ({ rut, motive, detail }) => {
    const link = buildHumanWaLink({ rut, motive, detail });
    return (
      'Abre este link para escribir a soporte (mensaje listo):\n' +
      link +
      '\n\n0 menú'
    );
  },

  gracias: 'De nada. 0 menú',

  error:
    'No entendí.\n' +
    'Responde con 1, 2, 3, 4 o 0.',
};
