'use client';

import { useState, useEffect } from 'react';

type Mensaje = {
  role: 'user' | 'assistant';
  content: string;
  tools?: { nombre: string; argumentos: any; resultado?: any }[];
};

export default function Chat() {
  const [historial, setHistorial] = useState<Mensaje[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente de RRHH de Runa. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado para el contador de espera (Rate Limit)
  const [tiempoEspera, setTiempoEspera] = useState<number | null>(null);

  // Lógica del contador regresivo
  // Lógica del contador regresivo optimizada
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (tiempoEspera !== null) {
      timer = setInterval(() => {
        setTiempoEspera((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null; // Esto elimina la alerta y desbloquea el chat
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [tiempoEspera]);

  const enviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Si hay un bloqueo por cuota o ya está cargando, no permitir envío
    if (!input.trim() || isLoading || tiempoEspera !== null) return;

    const nuevosMensajes: Mensaje[] = [...historial, { role: 'user', content: input }];
    setHistorial(nuevosMensajes);
    setInput('');
    setIsLoading(true);

    try {
      // Construimos mensajes para la API incluyendo contexto de herramientas
      const mensajesParaAPI = nuevosMensajes.map(m => {
        let content = m.content;
        if (m.role === 'assistant' && m.tools && m.tools.length > 0) {
          const toolInfo = m.tools.map(t =>
            `[Se ejecutó ${t.nombre} con parámetros: ${JSON.stringify(t.argumentos)}]`
          ).join('\n');
          content = `${toolInfo}\n${content}`;
        }
        return { role: m.role, content };
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: mensajesParaAPI }),
      });

      const data = await res.json();

      if (!res.ok) {
        // DETECTOR DE CUOTA (Rate Limit)
        if (res.status === 429 || data.isQuotaError || data.error?.includes('quota')) {
          // Intentamos extraer los segundos del mensaje de error (ej: "retry in 11.5s")
          const match = data.error?.match(/(\d+\.?\d*)s/);
          const segundos = match ? Math.ceil(parseFloat(match[1])) : 60;
          setTiempoEspera(segundos);
          throw new Error(`Límite de cuota alcanzado.`);
        }
        throw new Error(data.error || "Error en la conexión con el servidor");
      }

      setHistorial((prev) => [...prev, { 
        role: 'assistant', 
        content: data.content,
        tools: data.tools 
      }]);
      
    } catch (error: any) {
      setHistorial((prev) => [...prev, { role: 'assistant', content: `❌ Ups: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const manejarTecla = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      
      <style>{`
        @keyframes latido {
          0% { opacity: 0.4; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(0.98); }
        }
      `}</style>

      <h1>Asistente de RRHH - Runa</h1>

      <div style={{ border: '1px solid #ccc', padding: '15px', height: '450px', overflowY: 'auto', marginBottom: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
        {historial.map((m, index) => (
          <div key={index} style={{ marginBottom: '20px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <strong>{m.role === 'user' ? '👤 Tú' : '🤖 Runa Bot'}:</strong>
            <br/>
            
            {/* Visualización técnica del Payload */}
            {m.tools && m.tools.length > 0 && (
              <div style={{ marginBottom: '10px', marginTop: '6px', textAlign: 'left' }}>
                {m.tools.map((t, i) => (
                  <div key={i} style={{ 
                    background: '#2d2d2d', 
                    color: '#e2e8f0', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    display: 'block', 
                    marginBottom: '8px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '6px' }}>
                      ⚡ Llamada a la API: {t.nombre}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>
                      ▼ PAYLOAD (Body):
                    </div>
                    <pre style={{
                      margin: '0',
                      background: '#1e1e1e',
                      padding: '8px',
                      borderRadius: '4px',
                      color: '#fbbf24',
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(t.argumentos, null, 2)}
                    </pre>
                    {t.resultado && (
                      <>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '8px', marginBottom: '2px' }}>
                          ▲ RESPUESTA:
                        </div>
                        <pre style={{
                          margin: '0',
                          background: '#1e1e1e',
                          padding: '8px',
                          borderRadius: '4px',
                          color: '#34d399',
                          overflowX: 'auto'
                        }}>
                          {JSON.stringify(t.resultado, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {m.content && (
              <div style={{ 
                display: 'inline-block', 
                background: m.role === 'user' ? '#0070f3' : '#f1f1f1', 
                color: m.role === 'user' ? 'white' : '#1a1a1a', 
                padding: '12px 16px', 
                borderRadius: m.role === 'user' ? '15px 15px 0 15px' : '15px 15px 15px 0', 
                margin: '5px 0', 
                textAlign: 'left', 
                whiteSpace: 'pre-wrap', 
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {m.content}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <strong>🤖 Runa Bot:</strong><br/>
            <div style={{ display: 'inline-block', background: '#f8f9fa', color: '#666', padding: '12px 16px', borderRadius: '15px 15px 15px 0', margin: '5px 0', border: '1px solid #e9ecef', animation: 'latido 1.5s infinite ease-in-out' }}>
              ⏳ Procesando y consultando herramientas...
            </div>
          </div>
        )}
      </div>

      {/* Banner de aviso de cuota excedida */}
      {tiempoEspera !== null && (
        <div style={{ 
          background: '#fff3cd', color: '#856404', padding: '12px', 
          borderRadius: '8px', marginBottom: '10px', fontSize: '14px',
          border: '1px solid #ffeeba', textAlign: 'center', fontWeight: 'bold'
        }}>
          🛑 Límite de API alcanzado. Por favor, espera {tiempoEspera}s para volver a preguntar.
        </div>
      )}

      <form onSubmit={enviarMensaje} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
      <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={manejarTecla}
          placeholder="Escribe tu mensaje... (Usa Shift + Enter para salto de línea)"
          style={{ 
            flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', 
            outline: 'none', resize: 'none', minHeight: '44px', fontFamily: 'inherit',
            lineHeight: '1.5'
          }}
          disabled={isLoading}
          rows={2}
        />
        <button 
          type="submit" 
          disabled={isLoading || tiempoEspera !== null} 
          style={{ 
            padding: '10px 20px', height: '44px', 
            background: (isLoading || tiempoEspera !== null) ? '#99c2ff' : '#0070f3', 
            color: 'white', border: 'none', borderRadius: '8px', 
            cursor: (isLoading || tiempoEspera !== null) ? 'not-allowed' : 'pointer', 
            transition: 'background 0.3s' 
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}