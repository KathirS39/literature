import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';
import type { Room, Card, Player } from '../types';
import Hand from '../components/Hand';
import PlayerList from '../components/PlayerList';
import ScoreBoard from '../components/ScoreBoard';
import GameLog from '../components/GameLog';
import AskCardModal from '../components/AskCardModal';
import DeclareSetModal from '../components/DeclareSetModal';

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const [room, setRoom] = useState<Room | null>((location.state as { room?: Room })?.room ?? null);
  const [myHand, setMyHand] = useState<Card[]>(
    () => (location.state as { room?: Room })?.room?.players.find(p => p.id === socket.id)?.hand ?? []
  );
  const [showAsk, setShowAsk] = useState(false);
  const [showDeclare, setShowDeclare] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onUpdate = (data: Room) => {
      setRoom(data);
      const me = data.players.find(p => p.id === socket.id);
      if (me?.hand) setMyHand(me.hand);
    };
    const onError = ({ message }: { message: string }) => {
      setError(message);
      setTimeout(() => setError(''), 4000);
    };

    socket.on('room-update', onUpdate);
    socket.on('error', onError);
    socket.emit('get-room');
    return () => {
      socket.off('room-update', onUpdate);
      socket.off('error', onError);
    };
  }, []);

  if (!room) return <div className="center-message">Connecting to game…</div>;

  const me = room.players.find(p => p.id === socket.id);
  const isMyTurn = room.currentTurn === socket.id;
  const opponents: Player[] = room.players.filter(p => p.team !== me?.team);
  const activeName = room.players.find(p => p.id === room.currentTurn)?.name ?? '?';

  function handleAsk(targetId: string, card: Card) {
    socket.emit('ask-card', { targetId, card });
    setShowAsk(false);
  }

  function handleDeclare(halfSuit: string, mapping: Record<string, string>) {
    socket.emit('declare-set', { halfSuit, mapping });
    setShowDeclare(false);
  }

  function handlePass() {
    socket.emit('pass-turn');
  }

  return (
    <div className="game">
      <div className="game-topbar">
        <span className="game-title">Literature · {code}</span>
        <ScoreBoard scores={room.scores} declaredSets={room.declaredSets} />
      </div>

      {error && <div className="error-banner floating">{error}</div>}

      <div className="game-layout">
        <aside className="game-sidebar">
          <PlayerList players={room.players} currentTurn={room.currentTurn} myId={socket.id ?? ''} />
          <GameLog log={room.gameLog} />
        </aside>

        <main className="game-main">
          {room.status === 'finished' ? (
            <div className="winner-screen">
              {room.scores.A > room.scores.B && <h2>Team A Wins!</h2>}
              {room.scores.B > room.scores.A && <h2>Team B Wins!</h2>}
              {room.scores.A === room.scores.B && <h2>It's a Tie!</h2>}
              <div className="final-score">
                Team A: {room.scores.A} &nbsp;|&nbsp; Team B: {room.scores.B}
              </div>
            </div>
          ) : (
            <>
              <div className={`turn-banner ${isMyTurn ? 'my-turn' : ''}`}>
                {isMyTurn ? 'Your turn!' : `${activeName}'s turn`}
              </div>

              {isMyTurn && (
                <div className="action-row">
                  {myHand.length > 0 && (
                    <button className="btn-action" onClick={() => setShowAsk(true)}>
                      Ask for Card
                    </button>
                  )}
                  <button className="btn-action declare" onClick={() => setShowDeclare(true)}>
                    Declare Set
                  </button>
                  {myHand.length === 0 && (
                    <button className="btn-action pass" onClick={handlePass}>
                      Pass Turn
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <Hand cards={myHand} />
        </main>
      </div>

      {showAsk && (
        <AskCardModal
          myHand={myHand}
          opponents={opponents}
          onAsk={handleAsk}
          onClose={() => setShowAsk(false)}
        />
      )}
      {showDeclare && room && (
        <DeclareSetModal
          room={room}
          myId={socket.id ?? ''}
          onDeclare={handleDeclare}
          onClose={() => setShowDeclare(false)}
        />
      )}
    </div>
  );
}
