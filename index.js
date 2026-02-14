// index.js
const express = require("express");
const { MessagingResponse } = require("twilio").twiml;

const responses = require("./responses/messages");
const normalizeInput = require("./utils/normalizeInput");
const { getSession, resetSession, resetSupport } = require("./sessions/sessionManager");

const app = express();
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: false, limit: "256kb" }));

// Token store for short support links (in-memory)
const SUPPORT_LINK_TTL_MS = 10 * 60 * 1000; // 10 minutes
const supportLinks = new Map(); // token -> { text, createdAt }

function cleanupSupportLinks() {
  const now = Date.now();
  for (const [token, v] of supportLinks.entries()) {
    if (now - v.createdAt > SUPPORT_LINK_TTL_MS) supportLinks.delete(token);
  }
}

function makeToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function buildPublicBaseUrl(req) {
  // Prefer explicit env; otherwise infer from request.
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
  const host = req.get("host");
  return `${proto}://${host}`;
}

// Redirect endpoint: opens WhatsApp chat with prefilled message.
app.get("/support/:token", (req, res) => {
  cleanupSupportLinks();
  const token = req.params.token;
  const item = supportLinks.get(token);
  if (!item) {
    // Link expired or invalid
    return res.status(410).send("Link expirado. Vuelve al chat y elige Soporte (4) nuevamente.");
  }
  // IMPORTANT: WhatsApp click-to-chat
  const wa = `https://wa.me/56926125661?text=${encodeURIComponent(item.text)}`;
  return res.redirect(302, wa);
});

app.post("/webhook", (req, res) => {
  cleanupSupportLinks();

  const twiml = new MessagingResponse();
  const incomingMsg = (req.body.Body || "").trim();
  const from = req.body.From;

  const session = getSession(from);

  // New session (or timed out)
  if (session.isNew) {
    twiml.message(responses.bienvenida);
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml.toString());
  }

  // Global: menu
  const normalized = normalizeInput(incomingMsg);

  if (normalized === "0") {
    resetSession(session);
    twiml.message(responses.menuConHeader);
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml.toString());
  }

  // Support flow states
  if (session.state === "SUPPORT_RUT") {
    const rut = responses.normalizeRut(incomingMsg);
    if (!rut) {
      twiml.message(responses.soporte_rut_invalido);
    } else {
      session.support.rut = rut;
      session.state = "SUPPORT_MOTIVE";
      twiml.message(responses.soporte_motivo);
    }
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml.toString());
  }

  if (session.state === "SUPPORT_MOTIVE") {
    const motive = responses.mapMotivo(incomingMsg);
    if (!motive) {
      twiml.message(responses.soporte_motivo);
    } else {
      session.support.motive = motive;
      session.state = "SUPPORT_DETAIL";
      twiml.message(responses.soporte_detalle(session.support.motive));
    }
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml.toString());
  }

  if (session.state === "SUPPORT_DETAIL") {
    const detail = String(incomingMsg || "").trim();
    if (detail.length < 3) {
      twiml.message(responses.soporte_detalle(session.support.motive));
    } else {
      session.support.detail = detail.slice(0, 260);

      // Build prefilled support message
      const text = responses.buildSupportPrefill({
        rut: session.support.rut,
        motive: session.support.motive,
        detail: session.support.detail,
      });

      // Short link on your webhook domain (trusted)
      const token = makeToken();
      supportLinks.set(token, { text, createdAt: Date.now() });

      const base = buildPublicBaseUrl(req);
      const shortLink = `${base}/support/${token}`;

      // One message only (no copy/paste)
      twiml.message(responses.soporte_final(shortLink));

      resetSupport(session);
    }
    res.set("Content-Type", "text/xml");
    return res.status(200).send(twiml.toString());
  }

  // Normal menu routing
  switch (normalized) {
    case "1":
      twiml.message(responses.opcion1);
      break;
    case "2":
      twiml.message(responses.opcion2);
      break;
    case "3":
      twiml.message(responses.opcion3);
      break;
    case "4":
      // Explain briefly and ask RUT (single message to avoid ordering issues)
      session.state = "SUPPORT_RUT";
      twiml.message(responses.soporte_inicio);
      break;
    case "sobrecupo":
      twiml.message(responses.sobrecupo);
      break;
    case "gracias":
      twiml.message(responses.gracias);
      break;
    default:
      twiml.message(responses.error);
      break;
  }

  res.set("Content-Type", "text/xml");
  res.status(200).send(twiml.toString());
});

// Error handler: never leave Twilio without response
app.use((err, req, res, next) => {
  try {
    const twiml = new MessagingResponse();
    twiml.message("Hubo un error temporal. Responde 0 para ver el menú.");
    res.set("Content-Type", "text/xml");
    res.status(200).send(twiml.toString());
  } catch (e) {
    res.status(200).send("");
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Miriam Bot v3 corriendo en puerto ${PORT}`);
});