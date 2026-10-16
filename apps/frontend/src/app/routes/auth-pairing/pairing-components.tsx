export interface PinDisplayProps {
  pin: string | null;
  onGeneratePin: () => void;
  isLoading?: boolean;
}

export function PinDisplay({ pin, onGeneratePin, isLoading }: PinDisplayProps) {
  return (
    <div style={{ backgroundColor: '#1E293B', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#94A3B8' }}>PIN Temporal de Emparejamiento</h3>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {(pin || '----').split('').map((digit, idx) => (
          <div
            key={idx}
            style={{
              width: 52,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 'bold',
              backgroundColor: '#0F172A',
              color: '#38BDF8',
              borderRadius: '8px',
              border: '2px solid #0284C7',
            }}
          >
            {digit}
          </div>
        ))}
      </div>
      <button
        onClick={onGeneratePin}
        disabled={isLoading}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0284C7',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? 'Generando...' : 'Generar Nuevo PIN'}
      </button>
    </div>
  );
}

export function RfidWaitingIndicator({ waiting }: { waiting: boolean }) {
  if (!waiting) return null;

  return (
    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#064E3B', borderRadius: '8px', border: '1px solid #059669', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#34D399', animation: 'pulse 1.5s infinite' }} />
      <div>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#A7F3D0' }}>Esperando Tarjeta RFID en la Consola...</p>
        <span style={{ fontSize: '0.85rem', color: '#6EE7B7' }}>
          Acerca tu credencial o llavero al sensor RC522 de la estación interactiva.
        </span>
      </div>
    </div>
  );
}
