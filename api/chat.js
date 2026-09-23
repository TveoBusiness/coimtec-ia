```javascript
export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {

    const {
      message,
      history = []
    } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Falta el mensaje"
      });
    }


    /* =====================================================
       CONFIGURACIÓN
    ===================================================== */

    const GEMINI_API_KEY =
      process.env.GEMINI_API_KEY;

    const WHATSAPP_URL =
      "https://wa.me/message/PJBMLOLZEDVPF1";

    /*
      Usamos Gemini Flash.
    */

    const GEMINI_MODEL =
      "gemini-3.8-flash";


    if (!GEMINI_API_KEY) {

      console.error(
        "Falta GEMINI_API_KEY"
      );

      return res.status(500).json({
        error: "No está configurada GEMINI_API_KEY"
      });

    }


    /* =====================================================
       DETECTAR SOLICITUD DE ASESOR
    ===================================================== */

    function solicitaAsesor(texto) {

      const textoNormalizado =
        String(texto)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

      const frases = [

        "asesor",
        "asesora",

        "vendedor",
        "vendedora",

        "ventas",

        "whatsapp",

        "contactar",
        "contactame",

        "comunicarme",

        "direccioname",
        "derivame",

        "hablar con alguien",

        "hablar con ventas",

        "hablar con un asesor",

        "hablar con una asesora",

        "quiero un asesor",

        "quiero una asesora",

        "quiero hablar con un asesor",

        "quiero hablar con una asesora",

        "necesito un asesor",

        "necesito una asesora",

        "pasame con un asesor",

        "pasame con una asesora",

        "contacto con un asesor",

        "contacto con una asesora",

        "asesor por whatsapp",

        "asesora por whatsapp",

        "numero del asesor",

        "numero de la asesora"

      ];

      return frases.some(
        frase =>
          textoNormalizado.includes(frase)
      );

    }


    /* =====================================================
       INSTRUCCIONES DE COIMTEC IA
    ===================================================== */

    const systemInstruction = `
Eres COIMTEC IA, asistente inmobiliario digital de TVEO Business.

Tu función es atender clientes interesados en proyectos inmobiliarios
de Santa Cruz de la Sierra.

Debes responder siempre en español.

Tu comunicación debe ser:

- Humana.
- Profesional.
- Clara.
- Comercial.
- Amable.
- Natural.

No debes parecer un robot.

OBJETIVO:

1. Entender qué busca el cliente.
2. Detectar si busca vivienda, inversión o terreno.
3. Resolver sus dudas con la información disponible.
4. Detectar presupuesto cuando corresponda.
5. Generar confianza.
6. Guiar naturalmente al cliente hacia una reunión con TVEO Business.
7. No presionar artificialmente.

==================================================
PROYECTO ACTIVO
==================================================

Urbanización Laguna Norte II.

Categoría D.

Superficie:
300 m².

==================================================
UBICACIÓN
==================================================

A pocos minutos del puente nuevo,
diagonal a Colpacaranda,
rodeada de proyectos ya habitables.

==================================================
CONCEPTO URBANO
==================================================

- Urbanización abierta con características de cerrada.
- Único acceso.
- Pórtico de ingreso.
- Perímetro enmallado.

==================================================
AMENIDADES
==================================================

- Laguna de pesca.
- Fútbol 5.
- Fútbol 7.
- Vóley.
- Fútbol Playa.
- Churrasqueras.
- Parques infantiles.
- Club House.
- Piscina.

==================================================
ESTADO DE OBRAS INFORMADO
==================================================

- Piscina aproximadamente 70% de avance.
- Cimientos del Club House en ejecución.

==================================================
PRECIO INFORMADO
==================================================

Categoría D:

Precio regular:
14.100 $us.

Promoción al contado informada:

2 lotes por un precio total de:
7.050 $us.

Tipo de cambio informado:
6.97.

==================================================
REGLAS IMPORTANTES
==================================================

Nunca inventes:

- precios;
- promociones;
- cuotas;
- financiamiento;
- disponibilidad;
- características;
- fechas;
- teléfonos;
- nombres de asesores.

No modifiques los precios proporcionados.

No afirmes que un lote específico está disponible
si no tienes información actualizada.

No afirmes que una visita está agendada
porque no existe un sistema real de agenda.

Si el cliente pregunta algo que no está en esta información,
indica que debe ser confirmado por un asesor de TVEO Business.

No presentes información jurídica como asesoramiento legal.

==================================================
DOCUMENTACIÓN
==================================================

Los papeles están al día.

Se indica disponibilidad para transferencia
al momento de la compra.

El proyecto cuenta con visado del
Viceministerio de Defensa de los Derechos
del Usuario y del Consumidor.

==================================================
OFICINAS
==================================================

TVEO Business

Av. Virgen de Cotoca,
5to Anillo,
Edificio Ciudad Comercio.

Cuando detectes interés real,
puedes invitar al cliente a una reunión presencial
para revisar documentación, planimetría,
opciones y resolver dudas.

==================================================
FLUJO COMERCIAL
==================================================

CONSULTA
↓
INDAGACIÓN
↓
ENTENDIMIENTO
↓
INFORMACIÓN
↓
CONFIANZA
↓
REUNIÓN EN OFICINA
↓
REVISIÓN DE OPCIONES
↓
VISITA AL PROYECTO

==================================================
ASESOR
==================================================

Si el cliente solicita hablar con un asesor,
asesora, vendedor o ventas:

Indícale de manera natural que puede continuar
la atención directamente por WhatsApp.

No inventes números de teléfono.

No escribas enlaces de WhatsApp dentro de tu respuesta.
El sistema mostrará automáticamente el botón correspondiente.
`;


    /* =====================================================
       CONSTRUIR HISTORIAL PARA GEMINI
    ===================================================== */

    const contents = [];


    for (const item of history) {

      if (!item || !item.content) {
        continue;
      }

      const role =
        item.role === "assistant"
          ? "model"
          : "user";

      contents.push({

        role: role,

        parts: [
          {
            text: String(item.content)
          }
        ]

      });

    }


    /* =====================================================
       MENSAJE ACTUAL
    ===================================================== */

    contents.push({

      role: "user",

      parts: [
        {
          text: message
        }
      ]

    });


    /* =====================================================
       LLAMADA A GEMINI
    ===================================================== */

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;


    const response =
      await fetch(
        geminiUrl,
        {
          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "x-goog-api-key":
              GEMINI_API_KEY

          },

          body: JSON.stringify({

            system_instruction: {

              parts: [
                {
                  text: systemInstruction
                }
              ]

            },

            contents: contents,

            generationConfig: {

              temperature: 0.7,

              maxOutputTokens: 800

            }

          })

        }
      );


    const data =
      await response.json();


    /* =====================================================
       ERROR GEMINI
    ===================================================== */

    if (!response.ok) {

      console.error(
        "Gemini error:",
        data
      );

      return res.status(
        response.status
      ).json({

        error:
          "Error al conectar con Gemini",

        details:
          data?.error?.message || null

      });

    }


    /* =====================================================
       EXTRAER RESPUESTA
    ===================================================== */

    const answer =
      data
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim()
      ||
      "No pude generar una respuesta.";


    /* =====================================================
       DETECTAR ASESOR
    ===================================================== */

    const necesitaAsesor =
      solicitaAsesor(message);


    /* =====================================================
       RESPUESTA AL FRONTEND
    ===================================================== */

    return res.status(200).json({

      answer: answer,

      whatsapp:
        necesitaAsesor,

      whatsappUrl:
        necesitaAsesor
          ? WHATSAPP_URL
          : null

    });


  } catch (error) {

    console.error(
      "Server error:",
      error
    );

    return res.status(500).json({

      error:
        "Error interno del servidor"

    });

  }

}
```
