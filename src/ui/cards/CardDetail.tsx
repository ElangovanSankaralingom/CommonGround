import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActionCard, AbilityScores, ResourceType } from '../../core/models/types';
import { RESOURCE_COLORS } from './ActionCardDisplay';

interface CardDetailProps {
  card: ActionCard | null;
  roleColor: string;
  playerAbilities?: AbilityScores;
  canPlay: boolean;
  onPlay: (cardId: string) => void;
  onClose: () => void;
}

const CardDetail: React.FC<CardDetailProps> = ({
  card,
  roleColor,
  playerAbilities,
  canPlay,
  onPlay,
  onClose,
}) => {
  if (!card) return null;

  const costEntries = Object.entries(card.cost).filter(
    ([, amount]) => amount !== undefined && amount > 0
  ) as [ResourceType, number][];

  const abilityCheck = card.abilityCheck;
  const playerScore = abilityCheck && playerAbilities
    ? playerAbilities[abilityCheck.ability]
    : null;

  return (
    <AnimatePresence>
      {card && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Detail Panel */}
          <motion.div
            className="fixed bottom-0 left-1/2 z-50 w-full max-w-md"
            initial={{ y: '100%', x: '-50%' }}
            animate={{ y: 0, x: '-50%' }}
            exit={{ y: '100%', x: '-50%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div
              className="rounded-t-2xl bg-gradient-to-b from-amber-50 to-stone-100
                         shadow-2xl overflow-hidden"
              style={{ borderTop: `4px solid ${roleColor}` }}
            >
              {/* Header */}
              <div
                className="px-5 py-3 text-white flex items-center justify-between"
                style={{ backgroundColor: roleColor }}
              >
                <h2 className="text-lg font-bold">{card.name}</h2>
                <div
                  className="flex items-center justify-center rounded-full bg-white
                             font-bold shadow-sm"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 18,
                    color: roleColor,
                  }}
                >
                  {card.baseValue}
                </div>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Role & Series */}
                <div className="flex items-center justify-between text-sm">
                  <span
                    className="capitalize font-semibold px-2 py-0.5 rounded-full
                               text-white"
                    style={{ backgroundColor: roleColor }}
                  >
                    {card.roleId}
                  </span>
                  <span className="text-stone-500 font-medium capitalize">
                    Position: {card.seriesPosition}
                  </span>
                </div>

                {/* Description */}
                <p className="text-stone-700 text-sm leading-relaxed">
                  {card.description}
                </p>

                {/* Cost Breakdown */}
                {costEntries.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">
                      Cost
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {costEntries.map(([resource, amount]) => (
                        <div
                          key={resource}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1
                                     text-white font-semibold text-sm"
                          style={{ backgroundColor: RESOURCE_COLORS[resource] }}
                        >
                          <span
                            className="inline-block rounded-full bg-white/30"
                            style={{ width: 8, height: 8 }}
                          />
                          <span className="capitalize">{resource}</span>
                          <span className="bg-white/20 rounded px-1">{amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Effects */}
                {card.effects.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">
                      Effects
                    </h4>
                    <ul className="space-y-1">
                      {card.effects.map((effect, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-stone-600
                                     bg-stone-100 rounded-lg px-2.5 py-1.5"
                        >
                          <span className="text-stone-400 font-mono text-xs mt-0.5">
                            {i + 1}.
                          </span>
                          <span>
                            <span className="font-semibold capitalize">
                              {effect.type.replace(/_/g, ' ')}
                            </span>
                            {' '}
                            <span className="text-stone-400">
                              ({effect.target})
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ability Check */}
                {abilityCheck && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                      Ability Check Required
                    </h4>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold capitalize text-stone-700">
                          {abilityCheck.ability}
                        </span>
                        {abilityCheck.skill && (
                          <span className="text-stone-400 ml-1">
                            ({abilityCheck.skill})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500">DC {abilityCheck.threshold}</span>
                        {playerScore !== null && (
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              playerScore >= abilityCheck.threshold
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            You: {playerScore}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {card.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-stone-200 text-stone-600 px-2.5 py-0.5
                                   text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Flavor Text */}
                {card.flavorText && (
                  <p className="italic text-stone-400 text-sm border-t border-stone-200 pt-3">
                    "{card.flavorText}"
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2 pb-1">
                  <button
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-stone-500
                               bg-stone-200 hover:bg-stone-300 transition-colors"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white
                               transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: canPlay ? roleColor : '#9CA3AF',
                    }}
                    disabled={!canPlay}
                    onClick={() => onPlay(card.id)}
                  >
                    Play Card
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CardDetail;
