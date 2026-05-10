import type { Card } from '../types';
import { SUIT_SYMBOLS, isRedSuit } from '../types';

const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A','JK'];
const SUIT_ORDER = ['spades','hearts','diamonds','clubs','red','black'];
const HALF_SUIT_ORDER = [
  'low-spades','high-spades','low-hearts','high-hearts',
  'low-diamonds','high-diamonds','low-clubs','high-clubs','eights',
];

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const hsDiff = HALF_SUIT_ORDER.indexOf(a.halfSuit) - HALF_SUIT_ORDER.indexOf(b.halfSuit);
    if (hsDiff !== 0) return hsDiff;
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

// Pivot point below the card — larger = tighter arc
const PIVOT_PX = 300;
const MAX_SPREAD_DEG = 54;

export default function Hand({ cards, clickable = false, onCardClick }: Props) {
  const sorted = sortCards(cards);
  const N = sorted.length;
  const spread = N <= 1 ? 0 : Math.min(MAX_SPREAD_DEG, N * 7);
  const step = N > 1 ? spread / (N - 1) : 0;

  return (
    <div className="hand">
      <h3>
        Your Hand <span className="card-count-badge">{N}</span>
        {clickable && <span className="hand-prompt">click the card they asked for</span>}
      </h3>
      {N === 0 ? (
        <p className="empty-hand">No cards — you can still declare a set on your turn.</p>
      ) : (
        <div className="fan-hand">
          {sorted.map((card, i) => {
            const angle = -spread / 2 + i * step;
            return (
              <div
                key={`${card.rank}-${card.suit}`}
                className={`fan-wrapper${clickable ? ' fan-clickable' : ''}`}
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: `50% ${PIVOT_PX}px`,
                  zIndex: i,
                }}
              >
                <button
                  className={`card ${isRedSuit(card.suit) ? 'red' : 'black'}${clickable ? ' card-clickable' : ''}`}
                  onClick={() => clickable && onCardClick?.(card)}
                  disabled={!clickable}
                >
                  <div className="card-corner card-corner-tl">
                    <span className="card-rank">{card.rank}</span>
                    <span className="card-suit-small">{SUIT_SYMBOLS[card.suit]}</span>
                  </div>
                  <span className="card-center-suit">{SUIT_SYMBOLS[card.suit]}</span>
                  <div className="card-corner card-corner-br">
                    <span className="card-rank">{card.rank}</span>
                    <span className="card-suit-small">{SUIT_SYMBOLS[card.suit]}</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
