import type { Player, PendingAsk } from '../types';

interface Props {
  players: Player[];
  myId: string;
  currentTurn: string | null;
  pendingAsk: PendingAsk | null;

  canInitiateAsk: boolean; // my turn, no pending anything
  selectedTargetId?: string | null;
  onAsk?: (targetId: string) => void;
}

const TABLE_W = 480;
const TABLE_H = 252;
const CX = TABLE_W / 2;       // 240
const CY = TABLE_H / 2;       // 126
const RX = 192;
const RY = 96;

// Angles (degrees, 0 = top, clockwise). I'm implied at 180° (bottom).
const SEAT_ANGLES = [240, 300, 0, 60, 120];

function tablePos(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + RX * Math.sin(rad), y: CY - RY * Math.cos(rad) };
}

export default function TableView({
  players, myId, currentTurn, pendingAsk, canInitiateAsk, selectedTargetId, onAsk,
}: Props) {
  const me = players.find(p => p.id === myId);
  const others = players.filter(p => p.id !== myId);
  const currentName = players.find(p => p.id === currentTurn)?.name ?? '';

  return (
    <div className="table-wrapper">
      <div className="table-oval-container" style={{ width: TABLE_W, height: TABLE_H }}>

        {/* Felt surface */}
        <div className="table-felt" />

        {/* Center label */}
        <div className="table-center-info">
          {currentTurn === myId ? (
            <span className="tcenter-your-turn">Your Turn</span>
          ) : currentTurn ? (
            <>
              <span className="tcenter-label">NOW PLAYING</span>
              <span className="tcenter-name">{currentName}</span>
            </>
          ) : (
            <span className="tcenter-brand">LITERATURE</span>
          )}
        </div>

        {/* Other players around the table */}
        {others.map((player, i) => {
          const angle = SEAT_ANGLES[i] ?? (i * 72);
          const { x, y } = tablePos(angle);
          const isActive   = player.id === currentTurn;
          const isAsker    = pendingAsk?.askerId === player.id;
          const isTarget   = pendingAsk?.targetId === player.id;
          const isOpponent = player.team !== me?.team;
          const askable    = canInitiateAsk && isOpponent && player.cardCount > 0;
          const isSelected = selectedTargetId === player.id;

          const classes = [
            'table-seat',
            isActive   ? 'seat-active'    : '',
            isAsker    ? 'seat-asker'     : '',
            isTarget   ? 'seat-target'    : '',
            isOpponent ? 'seat-opponent'  : 'seat-teammate',
            askable    ? 'seat-askable'   : '',
            isSelected ? 'seat-selected'  : '',
            player.team === 'A' ? 'team-a' : player.team === 'B' ? 'team-b' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={player.id}
              className={classes}
              style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)' }}
              onClick={() => askable && onAsk?.(player.id)}
              disabled={!askable}
              title={askable ? `Ask ${player.name} for a card` : undefined}
            >
              <div className="seat-token">
                <span className="seat-initial">{player.name[0].toUpperCase()}</span>
                {isActive  && <div className="seat-active-ring" />}
                {isAsker   && <div className="seat-badge">💬</div>}
                {isTarget  && <div className="seat-badge">❓</div>}
              </div>
              <div className="seat-label">
                <span className="seat-name">{player.name}</span>
                <span className="seat-count">{player.cardCount} cards</span>
                {askable && !isSelected && <span className="seat-ask-hint">tap to ask</span>}
                {isSelected && <span className="seat-ask-hint seat-selected-hint">selected</span>}
              </div>
            </button>
          );
        })}

</div>
    </div>
  );
}
