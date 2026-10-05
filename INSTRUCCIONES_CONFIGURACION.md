# Instrucciones para configurar el chatbot en producción (sesión local de Claude)

Este documento sirve para continuar el trabajo desde una sesión de Claude que corra
**en el computador del usuario** (Claude Desktop con navegador / Claude in Chrome, o
`claude remote-control`), que sí puede usar el navegador para configurar Railway y Twilio.

El código ya está terminado y probado. **Lo que falta es solo configuración y verificación.**

---

## 0. Cómo iniciar (lo hace el usuario)

1. Abrir **Claude Desktop** (pestaña Code) o una terminal con Claude Code, en la carpeta:
   `C:\Users\carlo\OneDrive\Escritorio\CHATBOT DRSEBASTIAN`
2. Activar el navegador: el navegador integrado de Claude Desktop o la extensión **Claude in Chrome**.
3. Pegar este mensaje en el chat:

   > Lee `INSTRUCCIONES_CONFIGURACION.md` de la rama `claude/elegant-albattani-tobcva` del repo
   > felipincolorado/chatbot-dr y ejecútalo paso a paso usando mi navegador. Yo ingreso
   > contraseñas y códigos 2FA. Detente solo en los puntos marcados con ⛔.

Si la carpeta local todavía no tiene este archivo, Claude debe obtenerlo primero (paso 1).

---

## Reglas obligatorias para Claude

- ⛔ **Detenerse y pedir al usuario** solo para: contraseñas, códigos 2FA, cualquier compra o
  servicio con costo, el número RNPI exacto y cualquier cambio en una campaña publicitaria activa.
- No comprar números, no activar suscripciones, no cerrar la cuenta de Twilio.
- No crear un proyecto Railway duplicado.
- No modificar campañas de Facebook/Meta: solo revisar e informar.
- **Nunca mostrar claves completas** (Auth Token, API keys) en pantalla, chat, logs ni commits.
  Para referirse a ellas, mostrar solo los últimos 4 caracteres.
- No subir archivos `.env` ni secretos a Git. Las variables se configuran **solo en el panel de Railway**.
- No activar IA (`AI_ENABLED` debe quedar en `false`).
- Usar solo enlaces oficiales, sin acortadores.

---

## 1. Preparar el código local

En la carpeta del proyecto:

```bash
git status                      # ¿es un repositorio git? ¿hay cambios sin guardar?
```

- **Si es un repo git:** si hay cambios locales sin commit, mostrarlos al usuario antes de continuar
  (no descartarlos). Luego:
  ```bash
  git fetch origin
  git checkout claude/elegant-albattani-tobcva
  git pull origin claude/elegant-albattani-tobcva
  ```
- **Si no es un repo git** (carpeta copiada a mano): clonar en una carpeta nueva al lado, sin borrar la actual:
  ```bash
  git clone -b claude/elegant-albattani-tobcva https://github.com/felipincolorado/chatbot-dr.git chatbot-dr-git
  ```
  Si la carpeta antigua tiene un `.env` con datos reales, **no** copiarlo al repo ni mostrar su contenido.

Verificar:

```bash
node -v          # se requiere Node 18 o superior
npm install
npm test         # esperado: 36 pass, 0 fail
```

Si alguna prueba falla, detenerse e informar antes de seguir.

---

## 2. Qué cambió en el código (contexto para Claude)

Versión **19.0.0**. Archivos principales:

| Archivo | Función |
|---|---|
| `index.js` | Arranque (`npm start`) |
| `src/app.js` | Express: `GET /health`, `POST /webhook`, validación de firma Twilio, deduplicación, límites, logs anónimos |
| `src/bot.js` | Lógica de conversación |
| `src/messages.js` | Textos, precios, enlace a soporte humano |
| `src/normalizeInput.js` | Reconocimiento de intenciones |
| `src/sessionManager.js` | Sesiones en memoria (30 min) |
| `src/config.js` | Variables de entorno |
| `src/ai.js` | IA opcional, desactivada |
| `test/` | 36 pruebas automatizadas |

Cambios clave:
- Menú nuevo: 1 Agendar · 2 Valores · 3 Cómo funciona · 4 Licencias · 5 Ya agendé / soy paciente · 0 Menú.
- **Ya no se pide RUT.** El enlace a soporte (`wa.me/56926125661`) solo lleva nombre y motivo, y solo se entrega en la opción 5.
- Se eliminó el envío diferido con `setTimeout`: todo va en la misma respuesta TwiML.
- **En producción (`NODE_ENV=production`) se valida la firma de Twilio:**
  - sin `TWILIO_AUTH_TOKEN` → el webhook responde **500**;
  - token incorrecto o URL distinta → responde **403**.
  Por eso **el token debe estar correcto en Railway ANTES de fusionar a `main`**.
- Se aceptan también los nombres antiguos `ACCOUNT_SID` / `AUTH_TOKEN`.

Detalles completos en `README.md`.

---

## 3. Railway (navegador)

1. Abrir https://railway.com/dashboard. ⛔ Si pide inicio de sesión o 2FA, esperar al usuario.
2. Buscar el proyecto/servicio vinculado al repo **felipincolorado/chatbot-dr**. No crear otro.
   Anotar: nombre del proyecto, servicio, **rama de despliegue** (Settings → Source) y si
   el despliegue automático está activo.
3. **Variables** del servicio. Revisar cuáles existen (mostrar solo nombres). Debe haber:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `TWILIO_ACCOUNT_SID` | SID de la cuenta Twilio actual (empieza con `AC`) |
   | `TWILIO_AUTH_TOKEN` | Auth Token **actual** de Twilio (ver paso 4.2) |
   | `AGENDA_URL` | `https://drsebastianaravena.cl/agendar/` |
   | `HUMAN_WHATSAPP_NUMBER` | `56926125661` |
   | `DOCTOR_FULL_NAME` | `Dr. Sebastián Aravena` |
   | `AI_ENABLED` | `false` |
   | `DOCTOR_RNPI` | ⛔ solo si el usuario entrega el número exacto |
   | `DOCTOR_RNPI_URL` | ⛔ solo si está verificado (https) |

   Si existen `ACCOUNT_SID` / `AUTH_TOKEN` (nombres antiguos), se pueden dejar; las nuevas tienen prioridad.
4. Settings → Deploy:
   - Start command: `npm start` (o vacío, Railway lo detecta).
   - **Healthcheck Path: `/health`**.
5. Settings → Networking: confirmar dominio público `https://….up.railway.app`. Si no existe,
   generar uno (gratuito). Anotar la URL → la llamaremos `DOMINIO`.
6. Opcional recomendado: agregar `PUBLIC_BASE_URL=https://DOMINIO` (sin barra final).

---

## 4. Twilio (navegador)

1. Abrir https://console.twilio.com. ⛔ Login y 2FA los hace el usuario.
2. **Auth Token:** en la página principal de la cuenta (Account Info), comparar los
   **últimos 4 caracteres** del Auth Token con los de `TWILIO_AUTH_TOKEN` en Railway.
   Si no coinciden, copiar el token actual a Railway **sin mostrarlo en el chat**.
   (Si la cuenta usa subcuentas, el token debe ser el de la cuenta dueña del sender.)
3. Messaging → Senders → **WhatsApp senders**: identificar el sender **activo** (no asumir que es el
   número antiguo). Confirmar estado *Online/Approved*. Anotar el número mostrando solo los
   últimos 4 dígitos.
4. En ese sender (o en el Messaging Service al que pertenece, si el sender usa uno):
   - *Webhook URL for incoming messages*: `https://DOMINIO/webhook`, método **POST**.
   - *Status callback*: dejar vacío o como estaba (no apuntarlo a `/webhook`).
5. Perfil de WhatsApp Business (nombre, descripción, web `https://drsebastianaravena.cl`, foto):
   ⛔ solo cambiar si el usuario aprueba los textos y la imagen. Debe identificarse como asistente virtual.

---

## 5. Desplegar

1. Con las variables listas (paso 3 y 4.2), fusionar la rama a la rama que despliega Railway
   (normalmente `main`):
   ```bash
   git checkout main
   git pull origin main
   git merge --no-ff claude/elegant-albattani-tobcva
   npm test                       # debe seguir en 36 pass
   git push origin main
   ```
   (Alternativa: crear y fusionar un Pull Request en GitHub.)
2. En Railway → Deployments, esperar a que el despliegue quede **Active/Success**.
3. Probar en el navegador `https://DOMINIO/health` → debe mostrar `{"status":"ok","version":"19.0.0"}`.
4. Logs de Railway: debe aparecer
   `Miriam Bot v19.0.0 escuchando en puerto … (firma Twilio: activa, IA: desactivada, …)`.

---

## 6. Prueba real por WhatsApp

1. ⛔ Pedir al usuario que escriba **"hola"** al número del bot desde su teléfono.
2. Probar en orden: `1`, `2`, `3`, `4`, `5` → nombre y apellido → `1` (debe llegar enlace a wa.me/56926125661 con
   "Hola, soy <nombre>. Motivo: Problema con mi reserva"), `0`, y un texto cualquiera ("asdf") para ver el mensaje de ayuda.
3. Tocar el enlace de soporte y confirmar que abre el chat con el número humano y el texto precargado
   **sin RUT ni datos personales**.
4. Twilio → Monitor → Logs → Messaging: cada mensaje entrante con respuesta saliente, **sin duplicados**.
   Monitor → Errors: no debe haber errores 11200.
5. Logs de Railway: líneas `[webhook] user=xxxx intent=…` con HTTP 200, sin textos ni números.

---

## 7. Facebook / Meta (solo revisar)

1. Abrir Meta Ads Manager / Business Suite. ⛔ Login lo hace el usuario.
2. Revisar si los anuncios **Click-to-WhatsApp** apuntan al número del bot (el sender de Twilio activo).
3. **No editar nada.** Si apuntan a otro número, informar: nombre de la campaña/anuncio, número actual
   (últimos 4 dígitos) y número correcto, y ⛔ pedir autorización expresa antes de cambiar.

---

## 8. Si algo falla

| Síntoma | Causa probable | Solución |
|---|---|---|
| El bot no responde, Twilio muestra 403 | Auth Token distinto o URL distinta | Corregir `TWILIO_AUTH_TOKEN`; fijar `PUBLIC_BASE_URL=https://DOMINIO` |
| Twilio muestra 500 | Falta `TWILIO_AUTH_TOKEN` | Agregarla en Railway |
| Error 11200 / timeout | Servicio caído o dominio incorrecto | Revisar `/health`, despliegue y webhook en Twilio |
| `/health` no responde | Despliegue fallido | Ver logs de build en Railway; volver a un despliegue anterior (Redeploy) |
| Urgente: hay que reponer el servicio ya | — | Temporalmente `TWILIO_VALIDATE_SIGNATURE=false` en Railway, y revertir apenas se corrija el token |
| Volver a la versión anterior | — | Railway → Deployments → Redeploy del despliegue previo, o `git revert -m 1 <merge>` en `main` |

---

## 9. Informe final que Claude debe entregar

- Archivos modificados (ver sección 2).
- Resultado de `npm test`.
- URL pública de Railway y resultado de `/health`.
- Webhook configurado en Twilio (URL y método).
- Número del sender de Twilio, parcialmente oculto (ej. `+56 9 ****1234`).
- Variables configuradas en Railway (**solo nombres**).
- Resultado de la prueba por WhatsApp (cada opción) y de los logs de Twilio (HTTP 200, sin duplicados).
- Estado de los anuncios Click-to-WhatsApp (solo revisado).
- Pendientes: RNPI (`DOCTOR_RNPI`, `DOCTOR_RNPI_URL`),
  perfil de WhatsApp Business si no se aprobó.
- Costos nuevos activados: **ninguno** (si se activó algo, explicar qué y por qué).
