const SYSTEM_INSTRUCTION = `
Eres COIMTEC IA, el asistente inteligente de TVEO Business, desarrolladora inmobiliaria de Santa Cruz de la Sierra, Bolivia.

Tu función es atender consultas comerciales sobre los proyectos inmobiliarios de TVEO Business de manera clara, amable, profesional y natural.

PROYECTO PRINCIPAL: URBANIZACIÓN LAGUNA NORTE II

Características:
- Urbanización ubicada en Santa Cruz de la Sierra.
- Categoría D.
- Lotes de 300 m².
- Ubicación a pocos minutos del nuevo puente, diagonal a Colpacaranda.
- Zona rodeada de proyectos habitacionales.
- Urbanización abierta con características de urbanización cerrada.
- Acceso controlado.
- Portería de ingreso.
- Cerramiento perimetral.

ÁREAS Y AMENIDADES:
- Laguna para pesca.
- Cancha de fútbol 5.
- Cancha de fútbol 7.
- Vóley.
- Fútbol playa.
- Churrasqueras.
- Áreas infantiles.
- Club House.
- Piscina.

AVANCE DE OBRAS:
- La piscina presenta aproximadamente un 70% de avance.
- Las fundaciones del Club House están en ejecución.

PRECIO REFERENCIAL:
- Precio regular: USD 14.100.
- Promoción de contado informada: 2 lotes por USD 7.050 en total.
- Tipo de cambio de referencia informado: Bs 6,97 por USD.

REGLAS:
- Nunca inventes disponibilidad de lotes.
- Nunca inventes precios, promociones, cuotas, financiamiento o descuentos.
- Si una información no está indicada aquí, informa que debe ser confirmada con un asesor de TVEO Business.
- No afirmes que una reserva fue realizada.
- No prometas visitas o reuniones como si ya estuvieran agendadas.
- No inventes información jurídica, financiera o contractual.
- No brindes asesoramiento jurídico.

OFICINA TVEO BUSINESS:
Av. Virgen de Cotoca, 5to Anillo,
Edificio Ciudad Comercio,
Piso PB, Local 101,
Santa Cruz de la Sierra, Bolivia.

FORMA DE RESPONDER:
- Responde siempre en español.
- Sé cordial, profesional y natural.
- Responde de forma clara y relativamente breve.
- Evita repetir información innecesariamente.
- Cuando sea útil, termina con una pregunta concreta para avanzar la conversación.
`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      ...corsHeaders()
    }
  });
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    if (url.pathname !== "/api/chat") {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return json(
        { error: "Método no permitido." },
        405
      );
    }

    try {

      // Obtener la clave Gemini desde Cloudflare Secrets Store
      const GEMINI_API_KEY =
        await env.GEMINI_API_KEY.get();

      if (!GEMINI_API_KEY) {
        return json(
          {
            error:
              "No se encontró GEMINI_API_KEY en Cloudflare."
          },
          500
        );
      }

      const body = await request.json();

      const message =
        typeof body.message === "string"
          ? body.message.trim()
          : "";

      const history =
        Array.isArray(body.history)
          ? body.history
          : [];

      if (!message) {
        return json(
          { error: "El mensaje está vacío." },
          400
        );
      }

      const contents = [];

      for (const item of history.slice(-20)) {

        if (
          !item ||
          typeof item.content !== "string"
        ) {
          continue;
        }

        contents.push({
          role:
            item.role === "assistant"
              ? "model"
              : "user",
          parts: [
            {
              text: item.content
            }
          ]
        });
      }

      contents.push({
        role: "user",
        parts: [
          {
            text: message
          }
        ]
      });

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
          },

          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: SYSTEM_INSTRUCTION
                }
              ]
            },

            contents: contents
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {

        console.error(
          "Gemini API error:",
          JSON.stringify(data)
        );

        return json(
          {
            error:
              data?.error?.message ||
              "Gemini rechazó la solicitud."
          },
          response.status
        );
      }

      const answer =
        data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          ?.join("\n")
          ?.trim();

      if (!answer) {
        return json(
          {
            error:
              "Gemini no devolvió una respuesta."
          },
          502
        );
      }

      return json({
        answer: answer
      });

    } catch (error) {

      console.error(
        "COIMTEC IA error:",
        error
      );

      return json(
        {
          error:
            "No pude conectarme con COIMTEC IA. " +
            (error?.message ||
              "Error interno.")
        },
        500
      );
    }
  }
};
