// responses/messages.js
const AGENDA_URL = "https://drsebastianaravena.cl/agendar/";

const menuBase =
  "Responde con un número:\n\n" +
  "1) Licencia\n" +
  "2) Valores\n" +
  "3) Agendar\n" +
  "4) Soporte pacientes\n\n" +
  "0) Menú";

function normalizeRut(input) {
  const raw = String(input || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s/g, "");

  // 12345678-9
  if (/^\d{7,8}-[\dk]$/.test(raw)) return raw;
  // 123456789 (sin guion)
  if (/^\d{8,9}$/.test(raw)) return raw.slice(0, -1) + "-" + raw.slice(-1);
  return null;
}

function mapMotivo(input) {
  const t = String(input || "").trim();
  if (t === "1") return "Licencia rechazada";
  if (t === "2") return "Reembolso / Reprogramar";
  if (t === "3") return "Problemas al agendar";
  if (t === "4") return "Otro";
  return null;
}

function soporte_detalle(motivo) {
  if (motivo === "Licencia rechazada") {
    return "Detalle en 1 frase (sin datos médicos).\nEj: Isapre/COMPIN rechazó el dd/mm por ____.";
  }
  return "Detalle en 1 frase (sin datos médicos).";
}

function buildSupportPrefill({ rut, motive, detail }) {
  // No “soy paciente” ni promesas: directo a lo operativo
  return (
    "Hola. Necesito ayuda.\n" +
    `RUT: ${rut}\n` +
    `Motivo: ${motive}\n` +
    `Detalle: ${detail}`
  );
}

function soporte_final(shortLink) {
  return (
    "Abrir WhatsApp de soporte (humano):\\n" +
    shortLink +
    "\\n\\n" +
    "Si el link no abre, vuelve al menú y presiona 4 nuevamente.\\n\\n" +
    "0 menú"
  );
}

module.exports = {
  // greeting (no “sobrecupo” aquí)
  bienvenida: `Hola, soy Miriam 👩‍💼, asistente virtual del Dr. Sebastián Aravena.\n\n${menuBase}`,
  menu: menuBase,
  menuConHeader: `Opciones:\n\n${menuBase}`,

  // 1) Licencia
  opcion1:
    "La licencia médica no se vende. Se define solo en consulta, según evaluación.\n" +
    "En salud mental, muchas veces el reposo sí es necesario; se evalúa sin juicio.\n" +
    "Si corresponde, el médico puede emitir hasta 14 días por teleconsulta (renovable si se necesita).\n\n" +
    "3 agendar · 0 menú",

  // 2) Valores
  opcion2:
    "Fonasa: $35.000\n" +
    "Particular/Isapre: $45.000\n\n" +
    "3 agendar · 0 menú",

  // 3) Agendar (+ frase suave sobre disponibilidad)
  opcion3:
    `Agenda aquí:\n${AGENDA_URL}\n\n` +
    "La disponibilidad es la que aparece en la agenda.\n\n" +
    "0 menú",

  // Keyword: sobrecupo (solo si lo escriben)
  sobrecupo:
    "La disponibilidad es la que aparece al agendar.\n" +
    "Si ya eres paciente y es un caso especial, presiona 4 (Soporte pacientes).\n" +
    "Para agendar: 3.",

  // Support
  soporte_inicio:
    "Soporte pacientes (solo si ya te atendiste o tienes reserva).
" +
    "Ingresa tu RUT (sin puntos y con guion).",
  soporte_rut_invalido: "RUT inválido. Ej: 12345678-9",
  soporte_motivo:
    "Motivo:\n" +
    "1 Licencia rechazada\n" +
    "2 Reembolso / Reprogramar\n" +
    "3 Problemas al agendar\n" +
    "4 Otro",

  soporte_detalle,
  soporte_final,

  // helpers used by index.js
  normalizeRut,
  mapMotivo,
  buildSupportPrefill,

  gracias: "De nada. 0 menú",
  error: "No entendí. Responde con 1, 2, 3, 4 o 0.",
};
