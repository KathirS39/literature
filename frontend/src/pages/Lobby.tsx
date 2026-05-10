import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import type { Room } from '../types';

export default function Lobby() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onUpdate = (data: Room) => {
      setRoom(data);
      if (data.status === 'playing') navigate(`/game/${code}`, { state: { room: data } });
    };
    const onError = ({ message }: { message: string }) => setError(message);

    socket.on('room-update', onUpdate);
    socket.on('error', onError);
    return () => {
      socket.off('room-update', onUpdate);
      socket.off('error', onError);
    };
  }, [code, navigate]);

  function assignTeam(playerId: string, team: 'A' | 'B') {
    setError('');
    socket.emit('assign-team', { playerId, team });
  }

  function startGame() {
    setError('');
    socket.emit('start-game');
  }

  if (!room) {
    return <div className="center-message">Connecting to room {code}…</div>;
  }

  const isHost = room.hostId === socket.id;
  const teamA = room.players.filter(p => p.team === 'A');
  const teamB = room.players.filter(p => p.team === 'B');
  const canStart = isHost && room.players.length === 6 && room.players.every(p => p.team) && teamA.length === 3 && teamB.length === 3;

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>Literature</h1>
        <div className="room-code-display">
          Room Code: <strong>{code}</strong>
          <span className="player-count">{room.players.length}/6 players</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="lobby-body">
        <div className="lobby-players">
          <h2>Players</h2>
          {isHost && <p className="host-hint">As host, assign everyone to a team before starting.</p>}
          {room.players.map(p => (
            <div key={p.id} className={`lobby-player ${p.team ? `team-${p.team.toLowerCase()}` : ''}`}>
              <span className="lobby-player-name">
                {p.name}
                {p.id === socket.id && ' (you)'}
                {p.id === room.hostId && ' 👑'}
              </span>
              {isHost ? (
                <div className="team-btns">
                  <button
                    className={`team-btn a ${p.team === 'A' ? 'selected' : ''}`}
                    onClick={() => assignTeam(p.id, 'A')}
                  >
                    Team A
                  </button>
                  <button
                    className={`team-btn b ${p.team === 'B' ? 'selected' : ''}`}
                    onClick={() => assignTeam(p.id, 'B')}
                  >
                    Team B
                  </button>
                </div>
              ) : (
                <span className={`team-tag ${p.team ? `team-${p.team.toLowerCase()}` : 'no-team'}`}>
                  {p.team ? `Team ${p.team}` : 'No team yet'}
                </span>
              )}
            </div>
          ))}
          {room.players.length < 6 && (
            <p className="waiting-hint">Waiting for {6 - room.players.length} more player{6 - room.players.length !== 1 ? 's' : ''}…</p>
          )}
        </div>

        <div className="lobby-rules">
          <h2>Quick Rules</h2>
          <ul>
            <li>6 players, 2 teams of 3</li>
            <li>Ask opponents for cards you need (must hold one from the same half-suit)</li>
            <li>Hit → ask again. Miss → they get the turn</li>
            <li>Declare a full half-suit by saying who on your team has each card</li>
            <li>8 half-suits total. Most sets wins!</li>
          </ul>
        </div>
      </div>

      {isHost && (
        <button
          className={`start-btn ${canStart ? 'ready' : ''}`}
          onClick={startGame}
          disabled={!canStart}
        >
          {canStart ? 'Start Game' : `Need ${6 - room.players.length > 0 ? `${6 - room.players.length} more player(s) and ` : ''}teams assigned`}
        </button>
      )}
    </div>
  );
}
