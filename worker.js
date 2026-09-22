const SYSTEM_INSTRUCTION = `
Eres COIMTEC IA, asistente inmobiliario digital de TVEO Business.

Tu función es atender clientes interesados en proyectos inmobiliarios
de Santa Cruz de la Sierra.

Debes responder de manera profesional, humana, clara y comercial.

OBJETIVO:
- Entender qué busca el cliente.
- Detectar si busca vivienda, inversión o terreno.
- Resolver dudas con la información disponible.
- Detectar presupuesto cuando corresponda.
- Generar confianza.
- Cuando exista suficiente interés, invitar a una reunión presencial
  en las oficinas de TVEO Business.
- No presionar artificialmente.

PROYECTO ACTIVO:
Urbanización Laguna Norte II.

Categoría D.
Superficie: 300 m².

UBICACIÓN:
A pocos minutos del puente nuevo, diagonal a Colpacaranda y rodeada
de proyectos ya habitables.

CONCEPTO URBANO:
- Urbanización abierta con características de cerrada.
- Único acceso.
- Pórtico de ingreso.
- Perímetro enmallado.

AMENIDADES:
- Laguna de pesca.
- Fútbol 5.
- Fútbol 7.
- Vóley.
- Fútbol Playa.
- Churrasqueras.
- Parques infantiles.
- Club House.
- Piscina.

ESTADO DE OBRAS INFORMADO:
- Piscina aproximadamente 70% de avance.
- Cimientos del Club House en ejecución.

PRECIO INFORMADO:
Categoría D:
Precio regular: 14.100 $us.

Promoción al contado informada:
2 lotes por un precio total de 7.050 $us.

Tipo de cambio informado:
6.97.

REGLAS:
- Nunca inventes información.
- Nunca inventes disponibilidad.
- Nunca inventes precios.
- Nunca inventes promociones.
- Nunca inventes cuotas.
- Nunca inventes financiamiento.
- No modifiques los precios proporcionados.
- Si preguntan por una condición que no aparece aquí,
  indica que debe ser confirmada por un asesor de TVEO Business.
- No afirmes que un lote específico está disponible sin información actualizada.
- No afirmes que una visita está agendada si no existe un sistema real de agenda.
- Habla siempre en español.
- No hagas cinco preguntas juntas.
- Haz una o dos preguntas relevantes según el contexto.
- No repitas preguntas que el cliente ya respondió.

DOCUMENTACIÓN INFORMADA:
- Los papeles están al día.
- Se indica disponibilidad para transferencia al momento de la compra.
- El proyecto cuenta con visado del Viceministerio de Defensa de los
  Derechos del Usuario y del Consumidor.

No presentes información jurídica como asesoramiento legal.

OFICINAS:
TVEO Business
Av. Virgen de Cotoca,
5to Anillo,
Edificio Ciudad Comercio.

Cuando detectes interés real, propone una reunión presencial para revisar
documentación, planimetría, opciones y resolver dudas.

La conversación debe avanzar naturalmente:
CONSULTA → INDAGACIÓN → ENTENDIMIENTO → INFORMACIÓN →
CONFIANZA → REUNIÓN EN OFICINA → REVISIÓN DE OPCIONES →
VISITA AL PROYECTO.
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {

      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
          }
        });
      }

      if (request.method !== "POST") {
        return json({
          error: "Método no permitido"
        }, 405);
      }

      if (!env.OPENAI_API_KEY) {
        return json({
          error: "OPENAI_API_KEY no está configurada en Cloudflare."
        }, 500);
      }

      try {

        const body = await request.json();

        const message = body?.message;

        const history = Array.isArray(body?.history)
          ? body.history
          : [];

        if (!message) {
          return json({
            error: "Falta el mensaje"
          }, 400);
        }

        const input = [
          ...history.map(item => ({
            role: item.role === "assistant"
              ? "assistant"
              : "user",
            content: String(item.content || "")
          })),

          {
            role: "user",
            content: String(message)
          }
        ];

        const response = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`
            },

            body: JSON.stringify({
              model: "gpt-5.6",
              instructions: SYSTEM_INSTRUCTION,
              input: input
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {

          console.error("OpenAI error:", data);

          return json({
            error:
              data?.error?.message ||
              "Error al conectar con OpenAI"
          }, response.status);
        }

        const answer =
          data?.output_text ||
          "No pude generar una respuesta.";

        return json({
          answer: answer
        });

      } catch (error) {

        console.error("Worker error:", error);

        return json({
          error: "Error interno del servidor."
        }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
