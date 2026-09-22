const SYSTEM_INSTRUCTION = `
Eres COIMTEC IA, el asistente inteligente de TVEO Business, desarrolladora inmobiliaria de Santa Cruz de la Sierra, Bolivia.

Tu función es atender consultas comerciales sobre los proyectos inmobiliarios de TVEO Business de manera clara, amable, profesional y orientada a ayudar al cliente.

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

PRECIO REFERENCIAL INFORMADO:
- Precio regular: USD 14.100.
- Promoción de contado informada: 2 lotes por USD 7.050 en total.
- Tipo de cambio de referencia informado: Bs 6,97 por USD.

REGLAS COMERCIALES IMPORTANTES:
- Nunca inventes disponibilidad de lotes.
- Nunca afirmes que un lote específico está disponible si el sistema no lo confirma.
- Nunca inventes precios, promociones, cuotas, financiamiento o descuentos.
- Si el cliente pregunta por una condición que no está expresamente indicada aquí, informa que debe ser confirmada con un asesor de TVEO Business.
- No prometas visitas ni reuniones como si ya estuvieran agendadas.
- No afirmes que una reserva fue realizada.
- No inventes información jurídica, financiera o contractual.
- Si una información no está disponible, dilo claramente.

DOCUMENTACIÓN:
- La documentación del proyecto se encuentra informada como vigente.
- La transferencia está disponible al momento de la compra según las condiciones correspondientes.
- El proyecto cuenta con visa del Viceministerio de Defensa de los Derechos del Usuario y del Consumidor.
- No brindes asesoramiento jurídico; para dudas legales deriva a un profesional.

OFICINA TVEO BUSINESS:
Av. Virgen de Cotoca, 5to Anillo,
Edificio Ciudad Comercio,
Piso PB, Local 101,
Santa Cruz de la Sierra, Bolivia.

PROCESO COMERCIAL:
1. Escuchar la consulta.
2. Identificar qué busca el cliente.
3. Comprender presupuesto, ubicación y necesidades.
4. Brindar información disponible.
5. Generar confianza.
6. Invitar a una reunión en la oficina cuando corresponda.
7. Revisar las opciones disponibles con un asesor.
8. Coordinar una visita al proyecto mediante el equipo comercial.

FORMA DE RESPONDER:
- Responde siempre en español.
- Sé cordial, profesional y natural.
- Da respuestas claras y relativamente breves.
- No repitas innecesariamente información que el cliente ya proporcionó.
- Cuando sea útil, termina con una pregunta concreta para avanzar la conversación.
`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // API de chat
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json(
          { error: "Método no permitido." },
          405
        );
      }

      try {
        // Secrets Store: obtener la clave mediante get()
        const OPENAI_API_KEY = await env.OPENAI_API_KEY.get();

        if (!OPENAI_API_KEY) {
          return json(
            { error: "No se encontró OPENAI_API_KEY en Cloudflare Secrets Store." },
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

        // Limitar historial para evitar solicitudes innecesariamente grandes
        const cleanHistory = history
          .slice(-20)
          .filter(item =>
            item &&
            typeof item.role === "string" &&
            typeof item.content === "string"
          )
          .map(item => ({
            role:
              item.role === "assistant"
                ? "assistant"
                : "user",
            content: item.content
          }));

        const input = [
          ...cleanHistory,
          {
            role: "user",
            content: message
          }
        ];

        const response = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: "gpt-5.6",
              instructions: SYSTEM_INSTRUCTION,
              input
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error(
            "OpenAI API error:",
            JSON.stringify(data)
          );

          return json(
            {
              error:
                data?.error?.message ||
                "OpenAI rechazó la solicitud."
            },
            response.status
          );
        }

        const answer =
          data.output_text ||
          data.output
            ?.flatMap(item => item.content || [])
            ?.filter(item => item.type === "output_text")
            ?.map(item => item.text)
            ?.join("\n") ||
          "No recibí una respuesta de OpenAI.";

        return new Response(
          JSON.stringify({ answer }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json; charset=UTF-8",
              "Cache-Control": "no-store",
              ...corsHeaders()
            }
          }
        );

      } catch (error) {
        console.error("Worker error:", error);

        return json(
          {
            error:
              "No pude conectarme con COIMTEC IA. " +
              (error?.message || "Error interno.")
          },
          500
        );
      }
    }

    // Todo lo demás lo maneja Cloudflare Assets
    return env.ASSETS.fetch(request);
  }
};
