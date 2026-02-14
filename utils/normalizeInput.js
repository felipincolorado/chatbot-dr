// utils/normalizeInput.js
function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function clean(text) {
  return stripAccents(String(text || ""))
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(t, words) {
  return words.some((w) => t.includes(w));
}

module.exports = function normalizeInput(text) {
  const t = clean(text);

  if (!t) return null;

  // direct numbers
  if (["0", "menu", "menú", "volver"].includes(t)) return "0";
  if (t === "1") return "1";
  if (t === "2") return "2";
  if (t === "3") return "3";
  if (t === "4") return "4";

  // keywords
  if (hasAny(t, ["sobrecupo", "sobre cupo", "urgente", "hoy", "ahora"])) return "sobrecupo";
  if (hasAny(t, ["licencia", "reposo", "14"])) return "1";
  if (hasAny(t, ["valor", "precios", "precio", "costo", "fonasa", "isapre", "particular"])) return "2";
  if (hasAny(t, ["agendar", "agenda", "hora", "cita", "reservar"])) return "3";
  if (hasAny(t, ["soporte", "paciente", "ayuda", "problema", "error"])) return "4";
  if (hasAny(t, ["gracias", "muchas gracias"])) return "gracias";

  return null;
};
