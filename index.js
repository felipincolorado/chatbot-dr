// index.js
const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: false }));

app.post("/webhook", (req, res) => {
  const msg = req.body.Body?.toLowerCase().trim();
  let response = "";

  switch (msg) {
    case "1":
      response = "💲 La atención es Teleconsulta y se realiza por Google Meet. El valor Fonasa es de 30 mil e Isapre 40 mil pesos.";
      break;
    case "2":
      response = "📅 Puedes agendar tu cita aquí: https://agendamiento.reservo.cl/makereserva/agenda/q0OWB6D0d0pBRf6L4Z64esF1k5i9N2";
      break;
    case "3":
      response = "💳 Aceptamos tarjetas de débito y crédito.";
      break;
    case "4":
      response = "📄 El Doctor Aravena es médico general egresado de la Universidad de Concepción. Puede verificar su número de registro 763509 en https://rnpi.superdesalud.gob.cl/";
      break;
    case "5":
      response = "👋 ¿Qué deseas hacer?\n\n1️⃣ Precio\n2️⃣ Agenda\n3️⃣ Pago\n4️⃣ Registro Médico";
      break;
    default:
      response = "👋 ¡Hola! ¿Qué deseas hacer?\n\n1️⃣ Precio\n2️⃣ Agenda\n3️⃣ Pago\n4️⃣ Registro Médico";
  }

  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${response}</Message></Response>`);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Bot funcionando en el puerto 3000");
});
