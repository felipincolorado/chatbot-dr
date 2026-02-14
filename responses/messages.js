// responses/messages.js

const AGENDA_URL = 'https://drsebastianaravena.cl/agendar/';
const HUMAN_WA_LINK = 'https://wa.me/56926125661';

const menuBase =
  'Responde con un número:\n\n' +
  '1️⃣ Licencia\n' +
  '2️⃣ Valores\n' +
  '3️⃣ Agendar\n' +
  '4️⃣ Soporte pacientes\n\n' +
  '0️⃣ Menú';

module.exports = {
  bienvenida:
    'Hola, soy Miriam 👩‍💼, asistente virtual del Dr. Sebastián Aravena.\n\n' +
    menuBase,

  menuConHeader: 'Opciones:\n\n' + menuBase,

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
    'Agenda aquí:\n' + AGENDA_URL + '\n' +
    'La disponibilidad es la que aparece en la agenda.\n\n' +
    '0 menú',

  // Respuesta suave para "sobrecupo"
  sobrecupoSuave:
    'La disponibilidad es la que aparece al agendar.\n' +
    'Si ya eres paciente y es un caso especial, presiona 4 (Soporte pacientes).\n' +
    'Para agendar: 3.',

  // Inicio soporte (explica por qué se piden datos)
  soporte_inicio:
    'Soporte pacientes (solo si ya te atendiste o tienes reserva).\n' +
    'Para poder ayudarte, completa estos datos. Te respondemos cuando estemos disponibles.\n\n' +
    '1/4 Nombre y apellido:',

  soporte_motivo:
    'Motivo:\n' +
    '1 Licencia rechazada\n' +
    '2 Reembolso / Reprogramar\n' +
    '3 Problemas al agendar\n' +
    '4 Otro',

  soporte_detalle: 'Detalle en 1 frase (sin datos médicos).',

  // Mensaje 1: link corto (separado para que el 2º mensaje sea copiable)
  soporte_link:
    'WhatsApp soporte:\n' +
    HUMAN_WA_LINK +
    '\n\nCopia y pega el mensaje que te envío a continuación.',

  // Mensaje 2: solo texto copiable
  soporte_texto: ({ name, rut, motive, detail }) => {
    return (
      `Hola, soy ${name}. Necesito soporte.\n` +
      `RUT: ${rut}\n` +
      `Motivo: ${motive}\n` +
      `Detalle: ${detail}`
    );
  },

  gracias: 'De nada. 0 menú',

  error: 'No entendí. Responde con 1, 2, 3, 4 o 0.',

  errorBasico: 'No puedo procesar ese mensaje. Responde con texto.',
};
