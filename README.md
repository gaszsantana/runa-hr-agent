# 🤖 Runa HR Agent - Time Off Assistant

Este proyecto es un agente de Inteligencia Artificial especializado en la gestión de **Time Off** (vacaciones y permisos) para los empleados de **Runa**. Permite consultar saldos de vacaciones, políticas de la empresa y registrar solicitudes mediante lenguaje natural.

## 🚀 Decisiones Arquitectónicas

Para este proyecto, se optó por un diseño robusto que prioriza la transparencia del agente y la resiliencia del sistema:

1.  **Manejo de Estado Manual (Imperativo)**: Se prescindió de los hooks de alto nivel en favor de una gestión manual con `useState`. Esto garantiza control total sobre el historial de mensajes y una gestión de errores granular.
2.  **Visibilidad de Procesos (Observabilidad)**: La interfaz renderiza un bloque técnico que muestra la **Llamada a la API** y el **Payload (JSON)** exacto que el agente envía, permitiendo auditar el razonamiento del modelo en tiempo real.
3.  **Resiliencia ante Límites de Cuota (Backoff)**: Se implementó un detector de errores `429 (Rate Limit)` con un contador regresivo dinámico en el frontend para gestionar los límites de la API de Google de forma amigable para el usuario.
4.  **Validación de Ambigüedad**: El agente utiliza un *System Prompt* estricto para validar datos antes de ejecutar herramientas, asegurando que los parámetros necesarios estén presentes antes de realizar cualquier acción.

## 🧠 Selección de LLM: Gemini 2.5 Flash

Se seleccionó **Gemini 2.5 Flash** por ser el modelo de Google con la mejor relación **costo-rendimiento** para tareas de razonamiento avanzado y baja latencia.

### 🛠️ Capacidades Clave
* **Pensamiento Crítico (Thinking):** Implementa un **"presupuesto de razonamiento"** (hasta 24k tokens) para realizar procesos de *chain-of-thought* internos, mejorando la precisión en lógica compleja.
* **Contexto Extenso:** Soporta hasta **1 millón de tokens**, ideal para procesar manuales de RRHH extensos en una sola consulta.
* **Function Calling:** Optimizado para la extracción precisa de parámetros JSON en la ejecución de herramientas.
* **Velocidad:** Ejecución un **33% más rápida** que versiones anteriores, garantizando respuestas instantáneas.

### 💰 Eficiencia y Costos
* **Económico:** Costo de entrada de tan solo **$0.15 USD por millón de tokens**.
* **Ahorro con Caching:** El uso de **Context Caching** permite reducir costos hasta en un **80%** en consultas recurrentes.
* **Nivel Gratuito:** Permite hasta **1,500 solicitudes diarias sin costo**, facilitando el desarrollo y testing.

## 🛠️ Supuestos y Asunciones (Assumptions)
* **Identidad del Usuario**: Se asume que el sistema de autenticación previo provee el `employeeId`. En esta demo, el agente solicita el ID al usuario si no lo tiene en contexto para simular la integración.
* **Manejo de Fechas**: Se asume que el formato estándar de procesamiento es `YYYY-MM-DD`. El bot interpreta inteligentemente frases como "la próxima semana" basándose en la fecha actual.
* **Consistencia de Datos**: Se asume que los servicios externos (herramientas) devuelven datos en formato JSON válido y que los IDs de empleados proporcionados existen en la base de datos de Runa.

## 🛠️ Stack Tecnológico

* **Framework**: Next.js 14+ (App Router)
* **IA**: Google Gemini 2.5 Flash (vía Vercel AI SDK)
* **Lenguaje**: TypeScript
* **Esquemas de Datos**: Zod (para validación de Function Calling)
* **Estilos**: CSS-in-JS

## 📋 Requisitos e Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/gaszsantana/runa-hr-agent.git
    cd runa-hr-agent
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env.local` con tu API Key:
    ```env
    GOOGLE_GENERATIVE_AI_API_KEY=tu_api_key_aqui
    ```

4.  **Ejecutar en desarrollo:**
    ```bash
    npm run dev
    ```

## 🧪 Casos de Prueba Validados (Demo)

Basado en las pruebas de sistema, el agente maneja con éxito los siguientes escenarios:

### 1. Registro de Vacaciones (Flujo con Ambigüedad)
* **Usuario:** "quiero pedir vacaciones"
* **Respuesta del Agente:** El bot identifica la falta de datos y solicita número de empleado y fechas.
* **Entrada de Usuario:** "id 5, desde el 2026-05-01 hasta el 2026-05-30".
* **Llamada a la API (`requestTimeOff`):**
    ```json
    {
      "startDate": "2026-05-01",
      "employeeId": "5",
      "endDate": "2026-05-30"
    }
    ```
* **Resultado:** Confirmación exitosa del registro.

### 2. Consulta de Saldo de Vacaciones
* **Usuario:** "quiero saber cuantos dias tengo disponible de vacaciones"
* **Llamada a la API (`getRemainingVacationDays`):**
    ```json
    {
      "employeeId": "5"
    }
    ```
* **Resultado:** "Tienes 12 días de vacaciones disponibles."

### 3. Consulta de Políticas de Empresa
* **Usuario:** "quiero saber la politica de la empresa" -> "política de teletrabajo"
* **Llamada a la API (`getCompanyPolicy`):**
    ```json
    {
      "topic": "teletrabajo"
    }
    ```
* **Resultado:** "Política sobre teletrabajo: Estándar."

### 4. Verificación de Disponibilidad (Multi-ID)
* **Usuario:** "quiero saber si a mi compañero de trabajo id 6 tiene vacaciones en la misma fecha que la mia"
* **Llamada a la API (`checkTeamAvailability`):**
    ```json
    {
      "employeeId": "6",
      "startDate": "2026-05-01",
      "endDate": "2026-05-30"
    }
    ```
* **Resultado:** Estado de disponibilidad: disponible.


## 📈 Próximos Pasos y Mejoras

### Con más tiempo, mejoraría:
* **Persistencia en Base de Datos**: Implementar una capa de base de datos (PostgreSQL/Redis) para que las conversaciones no se pierdan al refrescar el navegador.
* **Validación de Fechas en Tiempo Real**: Agregar lógica para que el bot no permita pedir vacaciones en fechas pasadas o fines de semana antes de llamar a la API.

### Si esto fuera a producción, añadiría:
* **Integración con Slack/Teams**: Un webhook que notifique automáticamente al mánager directo cuando un empleado bajo su cargo registre una nueva solicitud de "Time Off", permitiendo la aprobación con un solo clic desde la plataforma de mensajería.