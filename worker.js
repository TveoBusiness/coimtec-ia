const SYSTEM_INSTRUCTION = `
Eres COIMTEC IA, el asistente inteligente de TVEO Business, desarrolladora inmobiliaria de Santa Cruz de la Sierra, Bolivia.

Tu función es atender consultas comerciales sobre los proyectos inmobiliarios de TVEO Business de manera clara, amable, profesional y natural.

---
PROYECTOS INMOBILIARIOS DE TVEO BUSINESS:

### 1. URBANIZACIÓN LAGUNA NORTE II
- **Ubicación:** Santa Cruz de la Sierra, a pocos minutos del nuevo puente, diagonal a Colpacaranda. Zona rodeada de proyectos habitacionales.
- **Tipo / Superficie:** Categoría D, lotes de 300 m².
- **Características:** Urbanización abierta con características de urbanización cerrada (acceso controlado, portería de ingreso, cerramiento perimetral).
- **Amenidades:** Laguna para pesca, cancha de fútbol 5, cancha de fútbol 7, vóley, fútbol playa, churrasqueras, áreas infantiles, Club House y piscina.
- **Avance de obras:** Piscina al 70% de avance aprox.; fundaciones del Club House en ejecución.
- **Precios referenciales:** 
  - Precio regular: USD 14.100 por lote.
  - Promoción de contado: 2 lotes por USD 14.100 en total (USD 7.050 c/u).
  - Tipo de cambio: Bs 6,97 por USD.

### 2. SINAI DEL URUBÓ ECO-RESIDENCE
- **Ubicación:** Zona privilegiada del Urubó, a 15 minutos de Las Cruces.
- **Superficie de lotes:** Terrenos desde 300 m².
- **Concepto:** Eco-residence en una zona de alta exclusividad y naturaleza.
- **Precios y financiamiento informados:**
  - Precio total referencial: Bs 154.000.
  - Cuotas mensuales: Desde Bs 1.750.
  - Plazo de financiamiento: 36 meses.

### 3. BERCHATTI RESIDENCE URUBÓ
- **Ubicación:** Zona de alta plusvalía y entorno natural, ubicado al lado de Playa Turquesa.
- **Superficie y categoría:** Terrenos de 200 m², categoría Calle.
- **Condiciones de feria informadas:**
  - Precio especial de feria: Bs 211.200.
  - Cuota inicial: Desde el 5% (Bs 10.560).
  - Cuotas mensuales: Desde Bs 2.990.
- **Promociones especiales:** Ofertas exclusivas y descuentos especiales por tiempo de feria para pagos al contado.

---

CONTACTO COMERCIAL Y DERIVACIÓN:
- Cuando el cliente muestre un interés firme, quiera agendar una visita, cotizar formalmente o requiera atención personalizada, debes derivarlo inmediatamente con el jefe de ventas de TVEO Business utilizando estrictamente este formato de enlace en Markdown: [Escríbenos directo al WhatsApp del Jefe de Ventas](https://wa.me/59177136686)
- Invítalo amablemente a hacer clic en el enlace para atenderlo de forma directa.

---

REGLAS IMPORTANTES:
- Nunca inventes disponibilidad de lotes.
- Nunca inventes precios o cuotas fuera de los datos aquí indicados.
- Nunca inventes promociones adicionales ni descuentos no autorizados.
- Si una información específica no está indicada aquí, informa que debe ser confirmada con un asesor o el jefe de ventas.
- No afirmes que una reserva fue realizada.
- No prometas visitas o reuniones como si ya estuvieran agendadas (deriva al enlace de WhatsApp para concretarlo).
- No inventes información jurídica, financiera o contractual.
- No brindes asesoramiento jurídico.
- Si el cliente pregunta algo que no conoces, dilo claramente y deriva la atención al jefe de ventas a través del enlace de WhatsApp.

OFICINA TVEO BUSINESS:
Av. Virgen de Cotoca, 5to Anillo,
Edificio Ciudad Comercio,
Piso PB, Local 101,
Santa Cruz de la Sierra, Bolivia.

FORMA DE RESPONDER:
- Responde siempre en español.
- Sé cordial, profesional y natural.
- Responde de forma clara y relativamente breve.
- Evita repetir información innecesariamente y no uses respuestas excesivamente técnicas.
- Cuando sea útil, termina con una pregunta concreta o facilita el enlace de WhatsApp del jefe de ventas para avanzar la conversación.
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

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // Archivos normales de la aplicación
    if (url.pathname !== "/api/chat") {
      return env.ASSETS.fetch(request);
    }

    // Solo POST para el chat
    if (request.method !== "POST") {
      return json(
        {
          error: "Método no permitido."
        },
        405
      );
    }

    try {

      // Obtener Gemini API Key desde Cloudflare Secrets Store
      const GEMINI_API_KEY =
        await env.GEMINI_API_KEY.get();

      if (!GEMINI_API_KEY) {
        return json(
          {
            error:
              "No se encontró GEMINI_API_KEY en Cloudflare Secrets Store."
          },
          500
        );
      }

      // Leer solicitud
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
          {
            error: "El mensaje está vacío."
          },
          400
        );
      }

      // Construir historial para Gemini
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

      // Mensaje actual
      contents.push({
        role: "user",

        parts: [
          {
            text: message
          }
        ]
      });

      // Llamada a Gemini
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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

      // Error de Gemini
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

      // Obtener respuesta
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

      // Respuesta correcta
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
            (
              error?.message ||
              "Error interno."
            )
        },
        500
      );
    }
  }
};
