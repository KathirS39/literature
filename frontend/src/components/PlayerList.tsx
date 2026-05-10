import type { Player } from '../types';

interface Props {
  players: Player[];
  currentTurn: string | null;
  myId: string;
}

export default function PlayerList({ players, currentTurn, myId }: Props) {
  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');

  function renderPlayer(p: Player) {
    const isActive = p.id === currentTurn;
    const isMe = p.id === myId;
    return (
      <div key={p.id} className={`player-row ${isActive ? 'active' : ''} ${isMe ? 'me' : ''}`}>
        <span className="player-row-name">
          {isActive && <span className="turn-arrow">▶ </span>}
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
