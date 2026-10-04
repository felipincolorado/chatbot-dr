# chatbot-dr — Miriam, asistente virtual de agendamiento

Bot de WhatsApp (Twilio) del Dr. Sebastián Aravena. Prioriza el agendamiento en el
sitio oficial, responde dudas administrativas y deriva a pacientes al WhatsApp
humano de soporte. **No diagnostica, no indica medicamentos, no promete licencias
y no solicita RUT ni antecedentes clínicos.**

## Arquitectura

```
index.js                 Punto de entrada (npm start): carga config y levanta Express
src/config.js            Lee variables de entorno (sin secretos en código)
src/app.js               Express: GET /health, POST /webhook, firma Twilio, límites, logs anónimos
src/bot.js               Lógica conversacional pura (estado MENU / SUPPORT_MOTIVE)
src/messages.js          Textos, precios y enlace de derivación (solo motivo general)
src/normalizeInput.js    Detección determinista de intenciones (seguridad primero)
src/sessionManager.js    Sesiones en memoria, 30 min de inactividad, tope de 5.000
src/ai.js                Capa OPCIONAL de IA (AI_ENABLED=false por defecto)
test/                    Pruebas con node:test (sin dependencias extra)
```

Flujo: Twilio → `POST /webhook` (form-urlencoded) → validación de firma →
deduplicación por `MessageSid` → límite por remitente (30/min) → `bot.handleMessage`
→ respuesta TwiML inmediata con **un solo mensaje** (la derivación al soporte va
dentro de la misma respuesta; ya no se usa `setTimeout` ni envío diferido).

### Menú

```
1. Agendar consulta online      → videollamada, pago y horario en el sitio, confirmación por correo, URL oficial
2. Valores y previsión          → Fonasa/Dipreca $35.000 · Isapre $45.000 · precio único
3. Cómo funciona la consulta    → agendar/pagar → confirmación → videollamada → evaluación → documentos si corresponden
4. Información sobre licencias  → no se venden ni garantizan; las determina el médico
5. Ya soy paciente              → motivo general (1-4) → enlace wa.me con solo ese motivo
0. Volver al menú
```

Además reconoce palabras clave (precio, fonasa, reservar, receta, reprogramar,
“hablar con una persona”, etc.). Mensajes de crisis o urgencia reciben líneas de
ayuda (SAMU 131, *4141); mensajes con síntomas/medicamentos reciben un aviso de que
el chat no evalúa ni diagnostica. Lo no comprendido muestra en qué puede ayudar y
el menú.

### IA opcional

Con `AI_ENABLED=true` y `AI_API_KEY` configurada, los mensajes que el bot
determinista no entiende se envían (con RUT, correos, teléfonos y enlaces
**eliminados**) a un modelo que **solo elige** cuál de las respuestas
administrativas aprobadas corresponde, o `none`. El modelo nunca redacta texto
para el paciente. Mensajes clínicos o de crisis nunca llegan a la IA. Si hay error
o demora (> `AI_TIMEOUT_MS`), se muestra el menú. Proveedor soportado:
`anthropic` (paquete `@anthropic-ai/sdk`, dependencia opcional).
**Activar la IA tiene costo por uso: requiere autorización y clave del titular.**

## Variables de entorno

Ver `.env.example`. En Railway se configuran en el panel **Variables**, nunca en archivos versionados.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` | sí (prod) | `production` activa la validación de firma de Twilio |
| `TWILIO_ACCOUNT_SID` | recomendada | SID de la cuenta (alias antiguo: `ACCOUNT_SID`) |
| `TWILIO_AUTH_TOKEN` | **sí (prod)** | Token para validar la firma (alias antiguo: `AUTH_TOKEN`). Sin él, el webhook responde 500 en producción |
| `PUBLIC_BASE_URL` | no | URL pública exacta, ej. `https://xxx.up.railway.app`. Si falta se usa `X-Forwarded-Proto/Host` |
| `TWILIO_VALIDATE_SIGNATURE` | no | `false` solo para emergencias (desactiva la validación) |
| `AGENDA_URL` | no | Por defecto `https://drsebastianaravena.cl/agendar/` (solo https) |
| `HUMAN_WHATSAPP_NUMBER` | no | Por defecto `56926125661` (se aceptan espacios y `+`) |
| `DOCTOR_FULL_NAME` | no | Por defecto `Dr. Sebastián Aravena` (se usa con “del …”) |
| `DOCTOR_RNPI` | no | N° de RNPI. **Pendiente**: si está vacío, la línea de credencial no se muestra |
| `DOCTOR_RNPI_URL` | no | Enlace de verificación (https). Solo si fue verificado |
| `AI_ENABLED` | no | `false` por defecto |
| `AI_PROVIDER` / `AI_API_KEY` / `AI_MODEL` / `AI_TIMEOUT_MS` | no | Solo si se activa IA |

## Desarrollo y pruebas

```bash
npm install
npm test          # node --test (36 pruebas)
npm start         # http://localhost:3000/health
```

Resultado real (Node 22.22, 2026-10-04): `npm install` OK; `npm test` → **36 pass, 0 fail**;
arranque local con `NODE_ENV=production`: `/health` → `200 {"status":"ok","version":"19.0.0"}`,
webhook sin firma → `403`, webhook con firma válida → `200` con TwiML de bienvenida.
Log generado: `[webhook] user=6b8085a4e8 intent=saludo ms=3` (sin número ni texto).

Prueba manual del webhook en local (sin validación, `NODE_ENV` distinto de production):

```bash
curl -X POST localhost:3000/webhook -d "From=whatsapp:+56900000000&To=whatsapp:+56911111111&Body=hola"
```

Cobertura: normalización de saludos e intenciones, menú y respuestas, flujo de
soporte sin RUT, enlace sin datos sensibles, healthcheck, webhook con firma
válida/inválida/ausente (incluido proxy de Railway), duplicados y bucles, límite
de tamaño, funcionamiento sin IA y con IA simulada.

## Despliegue en Railway

1. Proyecto vinculado al repo `felipincolorado/chatbot-dr`, rama `main` (no crear duplicados).
2. Start command: `npm start` (Railway detecta Node con Nixpacks/Railpack).
3. Settings → Deploy → **Healthcheck Path**: `/health`.
4. Variables: `NODE_ENV=production`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
   `AGENDA_URL`, `HUMAN_WHATSAPP_NUMBER`, `DOCTOR_FULL_NAME`, `AI_ENABLED=false`
   (y `DOCTOR_RNPI` / `DOCTOR_RNPI_URL` solo cuando estén verificados).
   Si se rotó el Auth Token de Twilio al recuperar la cuenta, **actualizar `TWILIO_AUTH_TOKEN`** o todas las solicitudes responderán 403.
5. Settings → Networking → dominio público (`*.up.railway.app`, HTTPS).
6. Verificar `https://DOMINIO/health` → 200 y revisar logs (`Miriam Bot v19.0.0 escuchando…`).

## Configuración en Twilio

1. Messaging → Senders → WhatsApp senders: confirmar el sender activo y su estado *Online*.
2. En el sender (o en el Messaging Service al que pertenece), *Webhook URL for incoming messages*:
   `POST https://DOMINIO-RAILWAY/webhook`. Dejar vacío el *status callback* o apuntarlo a otra ruta.
3. Enviar “hola” desde un teléfono, probar opciones 1–5 y 0, y la derivación.
4. Monitor → Logs → Messaging / Errors: las solicitudes deben mostrar HTTP 200. Un 403
   indica token o URL incorrecta (ver `PUBLIC_BASE_URL`); un 500 indica falta de `TWILIO_AUTH_TOKEN`.

## Procedimiento de recuperación

- **El bot no responde**: revisar `GET /health`; revisar logs de Railway; revisar *Monitor → Errors* en Twilio (11200 = webhook falló).
- **403 en todas las solicitudes**: el `TWILIO_AUTH_TOKEN` no coincide con la cuenta del sender o la URL configurada en Twilio difiere del dominio. Corregir el token o fijar `PUBLIC_BASE_URL`. Como último recurso temporal: `TWILIO_VALIDATE_SIGNATURE=false` (revertir apenas se corrija).
- **Volver a la versión anterior**: en Railway → Deployments → *Redeploy* de un despliegue previo, o `git revert` del merge en `main`.
- **Cambio de dominio Railway**: actualizar el webhook en Twilio y `PUBLIC_BASE_URL` si se usa.
- Las sesiones están en memoria: un reinicio solo hace que el usuario vuelva a ver la bienvenida. No se requiere base de datos.

## Seguridad

- No se registran cuerpos de mensajes, números de teléfono, RUT ni tokens (los logs usan un hash corto del remitente).
- No se incluyen RUT ni datos clínicos en URLs; el enlace de soporte solo lleva el motivo general.
- Límite de 20 KB por solicitud, 1.000 caracteres por mensaje procesado, 30 mensajes/min por remitente.
- Se ignoran mensajes del propio número del bot, callbacks de estado y reintentos duplicados (anti-bucles).
- Historial de Git revisado (2026-10-04): sin credenciales.

## Pendiente / datos por confirmar

- `DOCTOR_RNPI` y `DOCTOR_RNPI_URL`: no se dispone del dato; no se muestra hasta que el titular lo entregue.
- Línea *4141 de prevención del suicidio y SAMU 131: verificar que se desea mostrarlas en el mensaje de crisis.
