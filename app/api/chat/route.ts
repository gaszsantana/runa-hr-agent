import { google } from '@ai-sdk/google';
import { generateText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await generateText({
      model: google('gemini-2.5-flash'), // Cambia a 1.5-flash si 2.5 sigue fallando
      system: `Eres el Asistente de RRHH oficial de Runa.
      
      INSTRUCCIONES TÉCNICAS CRÍTICAS:
      1. Tienes herramientas a tu disposición que REQUIEREN parámetros. NUNCA ejecutes una herramienta sin enviar TODOS sus parámetros obligatorios.
      2. Para 'getRemainingVacationDays', DEBES enviar obligatoriamente: employeeId.
      3. Para 'requestTimeOff', DEBES enviar obligatoriamente: employeeId, startDate y endDate.
      4. Para 'checkTeamAvailability', DEBES enviar obligatoriamente: employeeId, startDate y endDate.
      5. Para 'getCompanyPolicy', DEBES enviar obligatoriamente: topic.
      6. No digas que no puedes procesar parámetros; tu sistema está diseñado específicamente para recibirlos.
      7. Fechas deben estar en formato YYYY-MM-DD.
      8. Si falta algún dato, NO ejecutes la herramienta y pide amablemente lo que falta.

      CONFIRMACIÓN ANTES DE EJECUTAR:
      - Cuando tengas TODOS los datos necesarios para ejecutar una herramienta, NO la ejecutes de inmediato.
      - Primero muestra al usuario un resumen claro de los datos que vas a enviar y pregúntale si son correctos.
      - Ejemplo: "Voy a registrar tus vacaciones con estos datos:\n- Employee ID: 17\n- Fecha inicio: 2026-04-01\n- Fecha fin: 2026-04-10\n¿Es correcto?"
      - Solo ejecuta la herramienta DESPUÉS de que el usuario confirme (ej: "sí", "correcto", "dale", "ok").
      - Si el usuario dice que algo está mal, pídele la corrección y vuelve a confirmar.

      RESPUESTA DESPUÉS DE EJECUTAR HERRAMIENTAS:
      - Después de ejecutar una herramienta, SIEMPRE debes responder al usuario en lenguaje natural interpretando el resultado.
      - NUNCA respondas con texto genérico como "Solicitud procesada". Usa los datos reales del resultado.
      - Ejemplos:
        * Si getRemainingVacationDays devuelve { remainingDays: 12 }, responde: "Tienes 12 días de vacaciones disponibles."
        * Si requestTimeOff devuelve { success: true }, responde: "¡Listo! Tu solicitud de vacaciones del [fecha inicio] al [fecha fin] ha sido registrada exitosamente."
        * Si checkTeamAvailability devuelve { status: 'disponible' }, responde: "Tu equipo está disponible en esas fechas, no hay conflictos."

      CONTEXTO DE CONVERSACIÓN:
      - DEBES recordar TODOS los datos proporcionados en mensajes anteriores de la conversación (employeeId, fechas, nombres, etc.).
      - Si el usuario ya proporcionó su employeeId en un mensaje anterior, NO se lo vuelvas a pedir. Reutiliza el dato.
      - Si el usuario ya proporcionó fechas en un mensaje anterior, NO las vuelvas a pedir. Reutilízalas.
      - Revisa SIEMPRE el historial completo de la conversación antes de pedir datos al usuario.`,
      messages,
      maxSteps: 5,
      tools: {
        getRemainingVacationDays: tool({
          description: 'Obtiene los días de vacaciones restantes. Requiere employeeId.',
          parameters: z.object({ 
            employeeId: z.string().describe('El ID único del empleado') 
          }),
          execute: async ({ employeeId }) => ({ remainingDays: 12 }),
        }),
        requestTimeOff: tool({
          description: 'Registra una solicitud de vacaciones en el sistema de Runa.',
          parameters: z.object({
            employeeId: z.string().describe('ID del empleado'),
            startDate: z.string().describe('Fecha de inicio en formato YYYY-MM-DD'),
            endDate: z.string().describe('Fecha de fin en formato YYYY-MM-DD'),
          }),
          execute: async () => ({ success: true }),
        }),
        getCompanyPolicy: tool({
          description: 'Consulta políticas de la empresa.',
          parameters: z.object({ 
            topic: z.string().describe('El tema de la política a consultar') 
          }),
          execute: async ({ topic }) => ({ policy: `Política sobre ${topic}: Estándar.` }),
        }),
        checkTeamAvailability: tool({
          description: 'Verifica si otros miembros del equipo tienen vacaciones en esas fechas.',
          parameters: z.object({
            employeeId: z.string(),
            startDate: z.string(),
            endDate: z.string(),
          }),
          execute: async () => ({ status: 'disponible' }),
        }),
      },
    });

    // Procesamos las herramientas usadas con argumentos y resultados
    const herramientasUsadas: { nombre: string; argumentos: any; resultado: any }[] = [];

    for (const step of result.steps || []) {
      for (let i = 0; i < step.toolCalls.length; i++) {
        const tc = step.toolCalls[i] as any;
        const tr = step.toolResults?.[i] as any;

        herramientasUsadas.push({
          nombre: tc.toolName,
          argumentos: tc.input ?? tc.args ?? tc.parameters ?? {},
          resultado: tr?.output ?? tr?.result ?? null,
        });
      }
    }

    console.log("🔧 Herramientas:", JSON.stringify(herramientasUsadas, null, 2));

    // Si result.text está vacío, generamos una respuesta a partir de los resultados
    let textoFinal = result.text;
    if (!textoFinal && herramientasUsadas.length > 0) {
      const resúmenes = herramientasUsadas.map(h => {
        const res = h.resultado;
        if (!res) return null;
        if (res.remainingDays !== undefined) return `Tienes ${res.remainingDays} días de vacaciones disponibles.`;
        if (res.success) return `¡Listo! Tu solicitud de vacaciones ha sido registrada exitosamente.`;
        if (res.status) return `Estado de disponibilidad del equipo: ${res.status}.`;
        if (res.policy) return res.policy;
        return JSON.stringify(res);
      }).filter(Boolean);
      textoFinal = resúmenes.join('\n') || "Solicitud procesada en el sistema.";
    }
    textoFinal = textoFinal || "Solicitud procesada en el sistema.";

    return Response.json({ 
      content: textoFinal,
      tools: herramientasUsadas 
    });

  } catch (error: any) {
    console.error("🔥 Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}