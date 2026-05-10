import { useState } from 'react';
import type { Card, Player } from '../types';
import { SUIT_SYMBOLS, HALF_SUIT_LABELS, getCardsInHalfSuit, isRedSuit } from '../types';

interface Props {
  myHand: Card[];
  opponents: Player[];
  onAsk: (targetId: string, card: Card) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export default function AskCardModal({ myHand, opponents, onAsk, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedOpponent, setSelectedOpponent] = useState<Player | null>(null);
  const [selectedHalfSuit, setSelectedHalfSuit] = useState<string | null>(null);

  const myHalfSuits = [...new Set(myHand.map(c => c.halfSuit))];

  const askableCards = selectedHalfSuit
    ? getCardsInHalfSuit(selectedHalfSuit).filter(
        c => !myHand.some(m => m.rank === c.rank && m.suit === c.suit)
      )
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>✕</button>

        {step === 1 && (
          <>
            <h2>Ask for a Card</h2>
            <p className="modal-hint">Step 1: Pick an opponent to ask</p>
            <div className="option-list">
              {opponents.map(opp => (
                <button
                  key={opp.id}
                  className="option-btn"
                  onClick={() => { setSelectedOpponent(opp); setStep(2); }}
                >
                  {opp.name}
                  <span className="opp-count">{opp.cardCount} cards</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && selectedOpponent && (
          <>
            <h2>Ask {selectedOpponent.name}</h2>
            <p className="modal-hint">Step 2: Pick a half-suit you hold</p>
            <div className="option-list">
              {myHalfSuits.map(hs => (
                <button
                  key={hs}
                  className="option-btn"
                  onClick={() => { setSelectedHalfSuit(hs); setStep(3); }}
                >
                  {HALF_SUIT_LABELS[hs]}
                </button>
              ))}
            </div>
            <button className="btn-back" onClick={() => setStep(1)}>← Back</button>
          </>
        )}

        {step === 3 && selectedOpponent && selectedHalfSuit && (
          <>
            <h2>Ask {selectedOpponent.name}</h2>
            <p className="modal-hint">
              Step 3: Pick a card from {HALF_SUIT_LABELS[selectedHalfSuit]}
            </p>
            {askableCards.length === 0 ? (
              <p className="modal-warn">You already hold all cards in this half-suit. Go back and pick another.</p>
            ) : (
              <div className="card-pick-grid">
                {askableCards.map(card => (
                  <button
                    key={`${card.rank}-${card.suit}`}
                    className={`card-pick ${isRedSuit(card.suit) ? 'red' : 'black'}`}
                    onClick={() => onAsk(selectedOpponent.id, card)}
                  >
                    <span className="pick-rank">{card.rank}</span>
                    <span className="pick-suit">{SUIT_SYMBOLS[card.suit]}</span>
                  </button>
                ))}
              </div>
            )}
            <button className="btn-back" onClick={() => setStep(2)}>← Back</button>
          </>
        )}
      </div>
    </div>
  );
}
