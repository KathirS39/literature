import { useState } from 'react';
import type { Card, Player } from '../types';
import { SUIT_SYMBOLS, HALF_SUIT_LABELS, isRedSuit } from '../types';

interface Props {
  myHand: Card[];
  allPlayers: Player[];
  myId: string;
  onTransfer: (toId: string, card: Card) => void;
  onClose: () => void;
}

export default function TransferCardModal({ myHand, allPlayers, myId, onTransfer, onClose }: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const others = allPlayers.filter(p => p.id !== myId);

  const grouped: Record<string, Card[]> = {};
  for (const card of myHand) {
    (grouped[card.halfSuit] ??= []).push(card);
  }

  function handleConfirm() {
    if (!selectedPlayer || !selectedCard) return;
    onTransfer(selectedPlayer.id, selectedCard);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal declare-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose}>✕</button>
        <h2>Send a Card</h2>
        <p className="modal-hint">Use this to correct a mistake. Turn is unaffected.</p>

        <div className="transfer-section">
          <h3>Send to:</h3>
          <div className="option-list">
            {others.map(p => (
              <button
                key={p.id}
                className={`option-btn ${selectedPlayer?.id === p.id ? 'selected-opt' : ''}`}
                onClick={() => setSelectedPlayer(p)}
              >
                {p.name}
                <span className="opp-count">Team {p.team}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="transfer-section">
          <h3>Pick a card from your hand:</h3>
          <div className="hand-groups">
            {Object.entries(grouped).map(([hs, hsCards]) => (
              <div key={hs} className="hand-group">
                <div className="hand-group-label">{HALF_SUIT_LABELS[hs]}</div>
                <div className="hand-cards">
                  {hsCards.map((card, i) => {
                    const isSelected = selectedCard?.rank === card.rank && selectedCard?.suit === card.suit;
                    return (
                      <button
                        key={i}
                        className={`card ${isRedSuit(card.suit) ? 'red' : 'black'} card-clickable ${isSelected ? 'card-selected' : ''}`}
                        onClick={() => setSelectedCard(card)}
                      >
                        <span className="card-rank">{card.rank}</span>
                        <span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="declare-actions">
          <button className="btn-back" onClick={onClose}>Cancel</button>
          <button
            className="btn-action"
            onClick={handleConfirm}
            disabled={!selectedPlayer || !selectedCard}
          >
            Send Card
          </button>
        </div>
      </div>
    </div>
  );
}
