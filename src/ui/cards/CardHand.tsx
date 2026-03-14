import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { ActionCard } from '../../core/models/types';
import ActionCardDisplay from './ActionCardDisplay';
import CardDetail from './CardDetail';

interface CardHandProps {
  cards: ActionCard[];
  roleColor: string;
  selectedCardId: string | null;
  onCardSelect: (cardId: string) => void;
  onCardPlay: (cardId: string) => void;
  isHidden: boolean;
  canPlay: boolean;
}

/**
 * Calculates the rotation angle and vertical offset for each card in the fan.
 * Cards are distributed symmetrically around center.
 */
function getFanLayout(index: number, total: number) {
  const maxRotation = 3; // degrees per card from center
  const maxArc = 20; // max total arc spread in degrees
  const arcSpread = Math.min(total * maxRotation, maxArc);

  const midpoint = (total - 1) / 2;
  const normalizedPos = (index - midpoint) / Math.max(midpoint, 1);

  const rotation = normalizedPos * (arcSpread / 2);
  // Parabolic vertical offset: cards at edges are slightly higher
  const verticalOffset = Math.abs(normalizedPos) * 12;

  return { rotation, verticalOffset };
}

const CardBack: React.FC<{ roleColor: string }> = ({ roleColor }) => (
  <div
    className="rounded-xl shadow-md flex items-center justify-center
               bg-gradient-to-br from-stone-700 to-stone-900"
    style={{
      width: 150,
      height: 210,
      borderLeft: `5px solid ${roleColor}`,
    }}
  >
    <div
      className="rounded-lg border-2 border-stone-500 flex items-center justify-center
                 opacity-50"
      style={{ width: 80, height: 80 }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path
          d="M20 4L36 20L20 36L4 20L20 4Z"
          stroke="currentColor"
          strokeWidth="2"
          className="text-stone-400"
        />
        <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="2"
                className="text-stone-400" />
      </svg>
    </div>
  </div>
);

const CardHand: React.FC<CardHandProps> = ({
  cards,
  roleColor,
  selectedCardId,
  onCardSelect,
  onCardPlay,
  isHidden,
  canPlay,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<ActionCard | null>(null);

  const handleCardClick = useCallback(
    (card: ActionCard) => {
      if (isHidden) return;
      if (selectedCardId === card.id) {
        // Already selected: open detail
        setDetailCard(card);
      } else {
        onCardSelect(card.id);
      }
    },
    [isHidden, selectedCardId, onCardSelect]
  );

  const handlePlay = useCallback(
    (cardId: string) => {
      setDetailCard(null);
      onCardPlay(cardId);
    },
    [onCardPlay]
  );

  const handleCloseDetail = useCallback(() => {
    setDetailCard(null);
  }, []);

  return (
    <>
      <div className="relative flex items-end justify-center w-full py-4"
           style={{ minHeight: 260 }}>
        {cards.map((card, index) => {
          const { rotation, verticalOffset } = getFanLayout(index, cards.length);
          const isSelected = selectedCardId === card.id;
          const isHovered = hoveredId === card.id;

          const liftY = isSelected ? -24 : isHovered ? -8 : 0;
          const translateY = verticalOffset + liftY;

          return (
            <motion.div
              key={card.id}
              className="cursor-pointer"
              style={{
                marginLeft: index === 0 ? 0 : -30,
                zIndex: isSelected ? 50 : isHovered ? 40 : index,
              }}
              initial={false}
              animate={{
                rotate: rotation,
                y: translateY,
                scale: isSelected ? 1.08 : isHovered ? 1.04 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                duration: 0.2,
              }}
              whileHover={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}
              onHoverStart={() => !isHidden && setHoveredId(card.id)}
              onHoverEnd={() => setHoveredId(null)}
              onClick={() => handleCardClick(card)}
            >
              {isHidden ? (
                <CardBack roleColor={roleColor} />
              ) : (
                <ActionCardDisplay
                  card={card}
                  roleColor={roleColor}
                  isSelected={isSelected}
                  compact
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Card Detail Popup */}
      <CardDetail
        card={detailCard}
        roleColor={roleColor}
        canPlay={canPlay}
        onPlay={handlePlay}
        onClose={handleCloseDetail}
      />
    </>
  );
};

export default CardHand;
