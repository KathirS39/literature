import type { Card } from '../types';
import { SUIT_SYMBOLS, HALF_SUIT_LABELS, isRedSuit } from '../types';

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', 'JK'];
const SUIT_ORDER = ['spades', 'hearts', 'diamonds', 'clubs', 'red', 'black'];

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const rankDiff = RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank);
    if (rankDiff !== 0) return rankDiff;
    return SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit);
  });
}

interface Props {
  cards: Card[];
  clickable?: boolean;
  onCardClick?: (card: Card) => void;
}

export default function Hand({ cards, clickable = false, onCardClick }: Props) {
  const grouped: Record<string, Card[]> = {};
  for (const card of cards) {
    (grouped[card.halfSuit] ??= []).push(card);
  }

  return (
    <div className="hand">
      <h3>
        Your Hand <span className="card-count-badge">{cards.length}</span>
        {clickable && <span className="hand-prompt">← click a card to give it</span>}
      </h3>
      {cards.length === 0 ? (
        <p className="empty-hand">No cards — you can still declare a set on your turn.</p>
      ) : (
        <div className="hand-groups">
          {Object.entries(grouped).map(([hs, hsCards]) => (
            <div key={hs} className="hand-group">
              <div className="hand-group-label">{HALF_SUIT_LABELS[hs]}</div>
              <div className="hand-cards">
                {sortCards(hsCards).map((card, i) => (
                  <button
                    key={i}
                    className={`card ${isRedSuit(card.suit) ? 'red' : 'black'} ${clickable ? 'card-clickable' : ''}`}
                    onClick={() => clickable && onCardClick?.(card)}
                    disabled={!clickable}
                  >
                    <span className="card-rank">{card.rank}</span>
                    <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
