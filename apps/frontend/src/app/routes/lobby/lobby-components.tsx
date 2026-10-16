export interface ParticipantItem {
  id: number;
  username: string;
  avatarUrl: string;
  vidas: number;
  ready: boolean;
}

export function LivesIndicator({ lives, maxLives = 3 }: { lives: number; maxLives?: number }) {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {Array.from({ length: maxLives }).map((_, idx) => (
        <span
          key={idx}
          style={{
            fontSize: '1.25rem',
            filter: idx < lives ? 'none' : 'grayscale(100%) opacity(30%)',
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}

export function PlayerCard({ player }: { player: ParticipantItem }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        backgroundColor: '#1E293B',
        borderRadius: '8px',
        border: '1px solid #334155',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: '#0284C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
          }}
        >
          {player.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h4 style={{ margin: 0 }}>{player.username}</h4>
          <span style={{ fontSize: '0.75rem', color: player.ready ? '#34D399' : '#F59E0B' }}>
            {player.ready ? 'Listo para jugar' : 'Esperando asignación'}
          </span>
        </div>
      </div>

      <LivesIndicator lives={player.vidas} />
    </div>
  );
}
