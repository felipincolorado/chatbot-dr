// src/ai.js
// Capa OPCIONAL de IA (AI_ENABLED=true). La IA nunca redacta texto libre para
// el paciente: solo elige cuál respuesta administrativa YA APROBADA corresponde
// a la pregunta. Si no hay coincidencia clara, devuelve null y el bot muestra
// el menú. Así no puede diagnosticar, inventar plazos ni prometer licencias.

const APPROVED_TOPICS = {
  agendar: 'Cómo reservar una hora: consulta online por videollamada, se elige horario y se paga en el sitio oficial, llega confirmación y enlace por correo.',
  valores: 'Precios: Fonasa/Dipreca $35.000, Isapre $45.000, precio único por la atención completa.',
  como_funciona: 'Pasos de la consulta: agendar y pagar, confirmación por correo, ingreso por videollamada, evaluación médica, documentos solo si corresponden.',
  licencias: 'Licencias médicas: no se venden ni garantizan; las determina el médico en la evaluación.',
  documentos: 'Recetas y certificados: solo si el médico determina que corresponden; sin costo adicional.',
  paciente: 'Pacientes que ya reservaron o se atendieron: problemas con reserva, reprogramación, reembolso, problemas posteriores. Se deriva a soporte humano.',
  sobrecupo: 'Disponibilidad de horarios y sobrecupos: solo los horarios publicados en el sitio de agendamiento.',
  humano: 'La persona pide hablar con alguien del equipo o tiene una consulta administrativa que no está en los otros temas.',
};

const SYSTEM_PROMPT =
  'Clasificas mensajes de WhatsApp enviados al asistente de agendamiento de una consulta médica online en Chile. ' +
  'Responde ÚNICAMENTE con uno de estos identificadores, sin ningún otro texto:\n' +
  Object.entries(APPROVED_TOPICS).map(([id, desc]) => `- ${id}: ${desc}`).join('\n') +
  '\n- none: el mensaje no corresponde claramente a ninguno de los temas anteriores, o pide un diagnóstico, ' +
  'tratamiento, medicamento u opinión médica.\n' +
  'Ante cualquier duda responde none.';

// Elimina datos personales antes de enviar el texto al proveedor.
function redact(text) {
  return String(text || '')
    .replace(/\b\d{1,2}\.?\d{3}\.?\d{3}\s*-?\s*[\dkK]\b/g, '[dato]') // RUT
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[dato]') // correos
    .replace(/\+?\d[\d\s-]{6,}\d/g, '[dato]') // teléfonos y números largos
    .replace(/https?:\/\/\S+/g, '[enlace]')
    .slice(0, 300)
    .trim();
}

function createAnthropicClassifier(aiConfig) {
  // Se carga solo si la IA está activa, para que el bot funcione sin el paquete.
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: aiConfig.apiKey, timeout: aiConfig.timeoutMs, maxRetries: 0 });

  return async function classify(text) {
    const response = await client.messages.create({
      model: aiConfig.model,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });
    if (response.stop_reason === 'refusal') return null;
    const block = response.content.find((b) => b.type === 'text');
    return block ? block.text : null;
  };
}

function createAi(aiConfig, { classifier } = {}) {
  if (!aiConfig || !aiConfig.enabled) return null;

  let classify = classifier;
  if (!classify) {
    if (!aiConfig.apiKey) {
      console.warn('[ai] AI_ENABLED=true pero falta AI_API_KEY; la IA queda desactivada.');
      return null;
    }
    if (aiConfig.provider !== 'anthropic') {
      console.warn(`[ai] Proveedor no soportado: ${aiConfig.provider}; la IA queda desactivada.`);
      return null;
    }
    try {
      classify = createAnthropicClassifier(aiConfig);
    } catch (err) {
      console.warn('[ai] No se pudo inicializar el proveedor; la IA queda desactivada.');
      return null;
    }
  }

  return {
    async pickTopic(userText) {
      const safe = redact(userText);
      if (safe.length < 3) return null;
      try {
        const raw = await Promise.race([
          classify(safe),
          new Promise((resolve) => setTimeout(() => resolve(null), aiConfig.timeoutMs).unref()),
        ]);
        const id = String(raw || '').trim().toLowerCase().replace(/[^a-z_]/g, '');
        return Object.prototype.hasOwnProperty.call(APPROVED_TOPICS, id) ? id : null;
      } catch (err) {
        console.warn('[ai] Error del proveedor:', err && err.status ? `HTTP ${err.status}` : 'sin detalle');
        return null;
      }
    },
  };
}

module.exports = { createAi, redact, APPROVED_TOPICS, SYSTEM_PROMPT };
