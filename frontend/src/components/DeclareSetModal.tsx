import { useState } from 'react';
import type { Room } from '../types';
import { HALF_SUITS, HALF_SUIT_LABELS, SUIT_SYMBOLS, getCardsInHalfSuit, isRedSuit } from '../types';

interface Props {
  room: Room;
  myId: string;
  onDeclare: (halfSuit: string, mapping: Record<string, string>) => void;
  onClose: () => void;
}

export default function DeclareSetModal({ room, myId, onDeclare, onClose }: Props) {
  const [selectedHalfSuit, setSelectedHalfSuit] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const me = room.players.find(p => p.id === myId);
  const teammates = room.players.filter(p => p.team === me?.team);
  const unclaimedSets = HALF_SUITS.filter(hs => !room.declaredSets[hs]);

  function handleConfirm() {
    if (!selectedHalfSuit) return;
    const cards = getCardsInHalfSuit(selectedHalfSuit);
    const allAssigned = cards.every(c => mapping[`${c.rank}-${c.suit}`]);
    if (!allAssigned) return;
    onDeclare(selectedHalfSuit, mapping);
  }

  if (!selectedHalfSuit) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <button className="modal-x" onClick={onClose}>✕</button>
          <h2>Declare a Set</h2>
          <p className="modal-hint">Pick an unclaimed half-suit to declare</p>
          <div className="option-list">
            {unclaimedSets.map(hs => (
              <button
                key={hs}
                className="option-btn"
                onClick={() => { setSelectedHalfSuit(hs); setMapping({}); }}
              >
                {HALF_SUIT_LABELS[hs]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cards = getCardsInHalfSuit(selectedHalfSuit);
  const allAssigned = cards.every(c => mapping[`${c.rank}-${c.suit}`]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal declare-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <h2>Declare {HALF_SUIT_LABELS[selectedHalfSuit]}</h2>
        <p className="modal-hint">
          Assign each card to the teammate who holds it. All 6 must be correct.
        </p>
        <div className="declare-rows">
          {cards.map(card => {
            const key = `${card.rank}-${card.suit}`;
            return (
              <div key={key} className="declare-row">
                <span className={`declare-card ${isRedSuit(card.suit) ? 'red' : 'black'}`}>
                  {card.rank}{SUIT_SYMBOLS[card.suit]}
                </span>
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
            disabled={!allAssigned}
          >
            Confirm Declaration
          </button>
        </div>
      </div>
    </div>
  );
}
