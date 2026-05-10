import { useState } from 'react';
import type { Room, Card } from '../types';
import { HALF_SUITS, HALF_SUIT_LABELS, SUIT_SYMBOLS, getCardsInHalfSuit, isRedSuit } from '../types';

interface Props {
  room: Room;
  myId: string;
  myHand: Card[];
  onDeclare: (halfSuit: string, mapping: Record<string, string>) => void;
  onClose: () => void;
}

export default function DeclareSetModal({ room, myId, myHand, onDeclare, onClose }: Props) {
  const [selectedHalfSuit, setSelectedHalfSuit] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const me = room.players.find(p => p.id === myId);
  const teammates = room.players.filter(p => p.team === me?.team);

  const declarableSets = HALF_SUITS.filter(hs =>
    !room.declaredSets[hs] && myHand.some(c => c.halfSuit === hs)
  );

  function handleConfirm() {
    if (!selectedHalfSuit) return;
    const cards = getCardsInHalfSuit(selectedHalfSuit);
    if (cards.some(c => !mapping[`${c.rank}-${c.suit}`])) return;
    onDeclare(selectedHalfSuit, mapping);
  }

  // Rendered inline (no overlay) so the hand stays visible below
  return (
    <div className="declare-panel">
      <div className="declare-panel-header">
        <h2>Declare a Set</h2>
        <button className="modal-x" onClick={onClose}>✕ Cancel</button>
      </div>

      {!selectedHalfSuit ? (
        <>
          {declarableSets.length === 0 ? (
            <p className="modal-warn">You don't hold any cards from an undeclared set.</p>
          ) : (
            <>
              <p className="modal-hint">Pick a half-suit you hold at least one card from:</p>
              <div className="option-list horizontal">
                {declarableSets.map(hs => (
                  <button
                    key={hs}
                    className="option-btn"
                    onClick={() => { setSelectedHalfSuit(hs); setMapping({}); }}
                  >
                    {HALF_SUIT_LABELS[hs]}
                  </button>
                ))}
              </div>
            </>
          )}
          <div>
            <button className="btn-back" onClick={onClose}>← Go Back</button>
          </div>
        </>
      ) : (
        <>
          <p className="modal-hint">
            <strong>{HALF_SUIT_LABELS[selectedHalfSuit]}</strong> — assign each card to the teammate who holds it:
          </p>
          <div className="declare-rows">
            {getCardsInHalfSuit(selectedHalfSuit).map(card => {
              const key = `${card.rank}-${card.suit}`;
              return (
                <div key={key} className="declare-row">
                  <div className={`declare-card ${isRedSuit(card.suit) ? 'red' : 'black'}`}>
                    <div className="card-corner card-corner-tl">
                      <span className="card-rank">{card.rank}</span>
                      <span className="card-suit-small">{SUIT_SYMBOLS[card.suit]}</span>
                    </div>
                    <span className="card-center-suit">{SUIT_SYMBOLS[card.suit]}</span>
                    <div className="card-corner card-corner-br">
                      <span className="card-rank">{card.rank}</span>
                      <span className="card-suit-small">{SUIT_SYMBOLS[card.suit]}</span>
                    </div>
                  </div>
                  <select
                    value={mapping[key] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}
                  >
                    <option value="">— pick player —</option>
                    {teammates.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.id === myId ? ' (you)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          <div className="declare-actions">
            <button className="btn-back" onClick={() => setSelectedHalfSuit(null)}>← Back</button>
            <button
              className="btn-action declare"
              onClick={handleConfirm}
              disabled={!getCardsInHalfSuit(selectedHalfSuit).every(c => mapping[`${c.rank}-${c.suit}`])}
            >
              Confirm Declaration
            </button>
          </div>
        </>
      )}
    </div>
  );
}
