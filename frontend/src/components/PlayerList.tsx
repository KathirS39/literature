import type { Player, PendingAsk } from '../types';

interface Props {
  players: Player[];
  currentTurn: string | null;
  myId: string;
  pendingAsk: PendingAsk | null;
}

export default function PlayerList({ players, currentTurn, myId, pendingAsk }: Props) {
  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');

  function renderPlayer(p: Player) {
    const isActive = p.id === currentTurn;
    const isMe = p.id === myId;
    const isAsker = pendingAsk?.askerId === p.id;
    const isTarget = pendingAsk?.targetId === p.id;

    return (
      <div key={p.id} className={`player-row ${isActive ? 'active' : ''} ${isMe ? 'me' : ''}`}>
        <span className="player-row-name">
          {isActive && !pendingAsk && <span className="turn-arrow">▶ </span>}
          {isAsker && <span className="ask-arrow">💬 </span>}
          {isTarget && <span className="ask-arrow">❓ </span>}
          {p.name}
          {isMe && <span className="you-label"> (you)</span>}
        </span>
        <span className="player-row-count">{p.cardCount} cards</span>
      </div>
    );
  }

  return (
    <div className="player-list">
      <div className="team-section team-a">
        <div className="team-label-header">Team A</div>
        {teamA.map(renderPlayer)}
      </div>
      <div className="team-section team-b">
        <div className="team-label-header">Team B</div>
        {teamB.map(renderPlayer)}
      </div>
    </div>
  );
}
