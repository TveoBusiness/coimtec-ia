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
       WHATSAPP
    ===================================================== */

    const WHATSAPP_URL =
      "https://wa.me/message/PJBMLOLZEDVPF1";


    /* =====================================================
       DETECTAR SOLICITUD DE ASESOR
    ===================================================== */

    function solicitaAsesor(texto) {

      const textoNormalizado =
        texto
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

        "direccioname",

        "derivame",

        "contactar",

        "comunicarme",

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

Debes analizar el contexto de la conversación y responder de manera
profesional, humana, clara y comercial.

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
- Si preguntan por una condición que no aparece aquí, indica que debe
  ser confirmada por un asesor de TVEO Business.
- No afirmes que un lote específico está disponible sin información
  actualizada.
- No afirmes que una visita está agendada si no existe un sistema real
  de agenda.
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

CONSULTA →
INDAGACIÓN →
ENTENDIMIENTO →
INFORMACIÓN →
CONFIANZA →
REUNIÓN EN OFICINA →
REVISIÓN DE OPCIONES →
VISITA AL PROYECTO.

Si el cliente solicita hablar con un asesor, vendedor o ventas,
puedes indicarle que puede continuar la atención por WhatsApp.

No inventes números de teléfono.
`;


    /* =====================================================
       CONSTRUIR HISTORIAL
    ===================================================== */

    const messages = [

      {
        role: "system",
        content: systemInstruction
      },

      ...history,

      {
        role: "user",
        content: message
      }

    ];


    /* =====================================================
       OPENAI
    ===================================================== */

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.OPENAI_API_KEY}`
        },

        body: JSON.stringify({

          model: "gpt-5.6",

          messages: messages,

          temperature: 0.7

        })
      }
    );


    const data =
      await response.json();


    /* =====================================================
       ERROR OPENAI
    ===================================================== */

    if (!response.ok) {

      console.error(
        "OpenAI error:",
        data
      );

      return res.status(
        response.status
      ).json({

        error:
          "Error al conectar con OpenAI"

      });

    }


    /* =====================================================
       RESPUESTA
    ===================================================== */

    const answer =
      data?.choices?.[0]?.message?.content ||
      "No pude generar una respuesta.";


    /* =====================================================
       DETECTAR SI NECESITA ASESOR
    ===================================================== */

    const necesitaAsesor =
      solicitaAsesor(message);


    /* =====================================================
       RESPUESTA PARA INDEX.HTML
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
