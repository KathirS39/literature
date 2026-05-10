import type { Card } from '../types';
import { SUIT_SYMBOLS, HALF_SUIT_LABELS, isRedSuit } from '../types';

export default function Hand({ cards }: { cards: Card[] }) {
  const grouped: Record<string, Card[]> = {};
  for (const card of cards) {
    (grouped[card.halfSuit] ??= []).push(card);
  }

  return (
    <div className="hand">
      <h3>Your Hand <span className="card-count-badge">{cards.length}</span></h3>
      {cards.length === 0 ? (
        <p className="empty-hand">No cards — you can still declare a set on your turn.</p>
      ) : (
        <div className="hand-groups">
          {Object.entries(grouped).map(([hs, hsCards]) => (
            <div key={hs} className="hand-group">
              <div className="hand-group-label">{HALF_SUIT_LABELS[hs]}</div>
              <div className="hand-cards">
                {hsCards.map((card, i) => (
                  <div key={i} className={`card ${isRedSuit(card.suit) ? 'red' : 'black'}`}>
                    <span className="card-rank">{card.rank}</span>
                    <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
