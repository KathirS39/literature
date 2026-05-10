import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import socket from '../socket';
import { clearRoomCode } from '../session';
import type { Room, Card, Player, PendingAsk } from '../types';
import { HALF_SUIT_LABELS, SUIT_SYMBOLS, getCardsInHalfSuit, isRedSuit } from '../types';
import Hand from '../components/Hand';
import PlayerList from '../components/PlayerList';
import ScoreBoard from '../components/ScoreBoard';
import GameLog from '../components/GameLog';
import DeclareSetModal from '../components/DeclareSetModal';
import TransferCardModal from '../components/TransferCardModal';
import TableView from '../components/TableView';

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const [room, setRoom] = useState<Room | null>((location.state as { room?: Room })?.room ?? null);
  const [myHand, setMyHand] = useState<Card[]>(
    () => (location.state as { room?: Room })?.room?.players.find(p => p.id === socket.id)?.hand ?? []
  );
  const [showDeclare, setShowDeclare]       = useState(false);
  const [showTransfer, setShowTransfer]     = useState(false);
  const [showSetTurn, setShowSetTurn]       = useState(false);
  const [error, setError]                   = useState('');
  const [missNotice, setMissNotice]         = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const prevPendingAsk = useRef<PendingAsk | null>(null);

  const myId = socket.id ?? '';

  useEffect(() => {
    const onUpdate = (data: Room) => {
      const prev = prevPendingAsk.current;
      if (prev?.askerId === myId && !data.pendingAsk && data.currentTurn !== myId) {
        const targetName = data.players.find(p => p.id === prev.targetId)?.name ?? 'them';
        setMissNotice(`Miss! ${targetName} didn't have it — their turn now.`);
        setTimeout(() => setMissNotice(''), 4000);
      }
      prevPendingAsk.current = data.pendingAsk;
      setRoom(data);
      const me = data.players.find(p => p.id === myId);
      if (me?.hand) setMyHand(me.hand);
      if (data.status === 'finished') clearRoomCode();
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
  }, [myId]);

  if (!room) return <div className="center-message">Connecting to game…</div>;

  const me           = room.players.find(p => p.id === myId);
  const isHost       = room.hostId === myId;
  const isMyTurn     = room.currentTurn === myId;
  const pending      = room.pendingAsk;
  const pendingChoice = room.pendingTurnChoice;
  const amAsker      = pending?.askerId === myId;
  const amTarget     = pending?.targetId === myId;
  const myTeamChooses = pendingChoice?.team === me?.team;
  const askerName    = room.players.find(p => p.id === pending?.askerId)?.name ?? '';
  const targetName   = room.players.find(p => p.id === pending?.targetId)?.name ?? '';
  const activeName   = room.players.find(p => p.id === room.currentTurn)?.name ?? '?';
  const teammates: Player[] = room.players.filter(p => p.team === me?.team);

  function initiateAsk(targetId: string) { socket.emit('initiate-ask', { targetId }); }
  function respondCard(card: Card)        { socket.emit('respond-card',  { card }); }
  function denyAsk()                      { socket.emit('deny-ask'); }
  function handlePass()                   { socket.emit('pass-turn'); }

  function handleDeclare(halfSuit: string, mapping: Record<string, string>) {
    socket.emit('declare-set', { halfSuit, mapping });
    setShowDeclare(false);
  }
  function handleTransfer(toId: string, card: Card) {
    socket.emit('transfer-card', { toId, card });
    setShowTransfer(false);
  }
  function handleSetTurn(targetPlayerId: string) {
    socket.emit('set-turn', { targetPlayerId });
    setShowSetTurn(false);
  }
  function handleChooseTurn(targetPlayerId: string) {
    socket.emit('choose-turn', { targetPlayerId });
  }

  const canInitiateAsk = isMyTurn && !pending && !pendingChoice;

  // Clear selection if we can no longer initiate an ask
  useEffect(() => {
    if (!canInitiateAsk) setSelectedTargetId(null);
  }, [canInitiateAsk]);

  return (
    <div className="game">

      {/* ── Top bar ── */}
      <div className="game-topbar">
        <div className="topbar-left">
          <span className="game-title">Literature</span>
          <span className="game-code">#{code}</span>
        </div>
        <ScoreBoard scores={room.scores} declaredSets={room.declaredSets} />
      </div>

      {/* ── Floating banners ── */}
      {error      && <div className="error-banner floating">{error}</div>}
      {missNotice && <div className="miss-notice floating">{missNotice}</div>}

      <div className="game-layout">

        {/* ── Sidebar ── */}
        <aside className="game-sidebar">
          <PlayerList players={room.players} currentTurn={room.currentTurn} myId={myId} pendingAsk={pending} />
          <GameLog log={room.gameLog} />
        </aside>

        {/* ── Main ── */}
        <main className="game-main">
          {room.status === 'finished' ? (
            <div className="winner-screen">
              {room.scores.A > room.scores.B && <h2>Team A Wins!</h2>}
              {room.scores.B > room.scores.A && <h2>Team B Wins!</h2>}
              {room.scores.A === room.scores.B && <h2>It's a Tie!</h2>}
              <div className="final-score">Team A: {room.scores.A} &nbsp;|&nbsp; Team B: {room.scores.B}</div>
            </div>
          ) : (
            <>
              {/* ── Round table ── */}
              <div className="game-table-zone">
                <TableView
                  players={room.players}
                  myId={myId}
                  currentTurn={room.currentTurn}
                  pendingAsk={pending}
                  canInitiateAsk={canInitiateAsk}
                  selectedTargetId={selectedTargetId}
                  onAsk={canInitiateAsk ? setSelectedTargetId : undefined}
                />
              </div>

              {/* ── Action strip ── */}
              <div className="game-actions">

                {/* Pending turn choice — wrong declaration */}
                {pendingChoice && myTeamChooses && (
                  <div className="turn-section">
                    <div className="turn-banner my-turn">Your team picks who goes next!</div>
                    <p className="turn-hint">Choose a teammate (or yourself):</p>
                    <div className="opponent-btns">
                      {teammates.map(p => (
                        <button key={p.id} className="opponent-btn" onClick={() => handleChooseTurn(p.id)}>
                          {p.name}
                          <span className="opp-card-count">{p.cardCount} cards</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {pendingChoice && !myTeamChooses && (
                  <div className="turn-section">
                    <div className="turn-banner waiting">Team {pendingChoice.team} is choosing who goes next…</div>
                  </div>
                )}

                {/* My turn, idle — player selected */}
                {!pendingChoice && isMyTurn && !pending && selectedTargetId && (() => {
                  const selectedPlayer = room.players.find(p => p.id === selectedTargetId);
                  return (
                    <div className="turn-section">
                      <div className="turn-banner my-turn">Your Turn</div>
                      <p className="turn-hint">
                        Ask <strong>{selectedPlayer?.name}</strong>? Tap a different opponent to change, or confirm:
                      </p>
                      <div className="action-row">
                        <button
                          className="btn-action confirm-ask"
                          onClick={() => { initiateAsk(selectedTargetId); setSelectedTargetId(null); }}
                        >
                          Ask {selectedPlayer?.name}
                        </button>
                        <button className="btn-action declare" onClick={() => setShowDeclare(true)}>
                          Declare Set
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* My turn, idle — no player selected yet */}
                {!pendingChoice && isMyTurn && !pending && !selectedTargetId && (
                  <div className="turn-section">
                    <div className="turn-banner my-turn">Your Turn</div>
                    <p className="turn-hint">Tap an opponent at the table to ask for a card</p>
                    <div className="action-row">
                      <button className="btn-action declare" onClick={() => setShowDeclare(true)}>
                        Declare Set
                      </button>
                      {myHand.length === 0 && (
                        <button className="btn-action pass" onClick={handlePass}>Pass Turn</button>
                      )}
                    </div>
                  </div>
                )}

                {/* My turn, waiting on target */}
                {!pendingChoice && isMyTurn && pending && amAsker && (
                  <div className="turn-section">
                    <div className="turn-banner waiting">Waiting for {targetName} to respond…</div>
                  </div>
                )}

                {/* I'm the target */}
                {!pendingChoice && !isMyTurn && amTarget && (
                  <div className="turn-section">
                    <div className="turn-banner being-asked">{askerName} is asking you for a card!</div>
                    <p className="turn-hint">Click the card in your hand, or say No:</p>
                    <button className="btn-no" onClick={denyAsk}>No — I don't have it</button>
                  </div>
                )}

                {/* Spectating */}
                {!pendingChoice && !isMyTurn && !amTarget && (
                  <div className="turn-section">
                    {pending ? (
                      <div className="turn-banner waiting">{askerName} asked {targetName} — waiting…</div>
                    ) : (
                      <div className="turn-banner">{activeName}'s turn</div>
                    )}
                  </div>
                )}

                {/* Inline declare panel */}
                {showDeclare && (
                  <DeclareSetModal
                    room={room}
                    myId={myId}
                    myHand={myHand}
                    onDeclare={handleDeclare}
                    onClose={() => setShowDeclare(false)}
                  />
                )}

                {/* Override buttons */}
                <div className="override-row">
                  {myHand.length > 0 && (
                    <button className="btn-override" onClick={() => setShowTransfer(true)}>Send a Card</button>
                  )}
                  {isHost && (
                    <button className="btn-override" onClick={() => setShowSetTurn(true)}>Override Turn</button>
                  )}
                </div>
              </div>

              {/* ── Hand zone ── */}
              <div className="game-hand-zone">
                <Hand
                  cards={myHand}
                  clickable={amTarget}
                  onCardClick={amTarget ? respondCard : undefined}
                />
                <EligibleCards myHand={myHand} />
              </div>
            </>
          )}
        </main>
      </div>

      {showTransfer && (
        <TransferCardModal
          myHand={myHand}
          allPlayers={room.players}
          myId={myId}
          onTransfer={handleTransfer}
          onClose={() => setShowTransfer(false)}
        />
      )}
      {showSetTurn && (
        <SetTurnModal
          players={room.players}
          currentTurn={room.currentTurn}
          onSetTurn={handleSetTurn}
          onClose={() => setShowSetTurn(false)}
        />
      )}
    </div>
  );
}

function SetTurnModal({ players, currentTurn, onSetTurn, onClose }: {
  players: Player[];
  currentTurn: string | null;
  onSetTurn: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <h2>Override Turn</h2>
        <p className="modal-hint">Select the player whose turn it should be:</p>
        <div className="option-list">
          {players.map(p => (
            <button
              key={p.id}
              className={`option-btn ${p.id === currentTurn ? 'selected-opt' : ''}`}
              onClick={() => onSetTurn(p.id)}
            >
              {p.name}
              <span className="opp-count">Team {p.team}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EligibleCards({ myHand }: { myHand: Card[] }) {
  const myHalfSuits = [...new Set(myHand.map(c => c.halfSuit))];
  const groups = myHalfSuits.map(hs => ({
    hs,
    label: HALF_SUIT_LABELS[hs],
    missing: getCardsInHalfSuit(hs).filter(
      c => !myHand.some(m => m.rank === c.rank && m.suit === c.suit)
    ),
  })).filter(g => g.missing.length > 0);

  return (
    <div className="eligible-cards">
      <h3>Cards you can ask for</h3>
      {groups.length === 0 && (
        <p className="empty-hand">No cards in hand — hold a card from a set to ask for others.</p>
      )}
      <div className="eligible-groups">
        {groups.map(({ hs, label, missing }) => (
          <div key={hs} className="eligible-group">
            <span className="eligible-label">{label}:</span>
            <div className="eligible-list">
              {missing.map(card => (
                <span
                  key={`${card.rank}-${card.suit}`}
                  className={`eligible-card ${isRedSuit(card.suit) ? 'red' : 'black'}`}
                >
                  {card.rank}{SUIT_SYMBOLS[card.suit]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
