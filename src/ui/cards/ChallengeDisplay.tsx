import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  ChallengeCard,
  SeriesInProgress,
  CombinationInProgress,
  ResourceType,
} from '../../core/models/types';
import { RESOURCE_COLORS } from './ActionCardDisplay';
import { CHALLENGE_CATEGORY_COLORS } from '../../core/models/constants';

interface ChallengeDisplayProps {
  challenge: ChallengeCard;
  seriesProgress?: SeriesInProgress;
  combinationProgress?: CombinationInProgress;
  isFacilitator?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  crisis: '\u26A0\uFE0F',
  opportunity: '\u2B50',
  tension: '\u26A1',
};

const RESOURCE_DISPLAY_NAMES: Record<string, string> = {
  budget: 'Funding',
  influence: 'Political Capital',
  volunteer: 'Community Labor',
  material: 'Building Materials',
  knowledge: 'Technical Expertise',
};

function getDifficultyDots(difficulty: number): number {
  if (difficulty <= 8) return 1;
  if (difficulty <= 10) return 2;
  if (difficulty <= 12) return 3;
  if (difficulty <= 14) return 4;
  return 5;
}

function getPublicCategory(category: string): 'crisis' | 'opportunity' | 'tension' {
  if (['ecological', 'safety'].includes(category)) return 'crisis';
  if (['commercial', 'infrastructure'].includes(category)) return 'opportunity';
  return 'tension';
}

const ChallengeDisplay: React.FC<ChallengeDisplayProps> = ({
  challenge,
  seriesProgress,
  combinationProgress,
  isFacilitator = false,
}) => {
  const [showBack, setShowBack] = useState(false);

  // Use publicFace if available, otherwise derive from existing data
  const publicCategory = challenge.publicFace?.category || getPublicCategory(challenge.category);
  const categoryColor = CHALLENGE_CATEGORY_COLORS[publicCategory] || '#F59E0B';
  const categoryIcon = CATEGORY_ICONS[publicCategory] || '';
  const difficultyDots = challenge.publicFace?.difficultyRating || getDifficultyDots(challenge.difficulty);

  const costEntries = Object.entries(challenge.requirements.resourceCost).filter(
    ([, amount]) => amount !== undefined && amount > 0
  ) as [ResourceType, number][];

  return (
    <div className="w-full max-w-xs rounded-2xl shadow-lg overflow-hidden"
      style={{ border: `2px solid ${categoryColor}` }}
    >
      {/* Card Front — PUBLIC FACE (Fix 2) */}
      <AnimatePresence mode="wait">
        {!showBack ? (
          <motion.div
            key="front"
            initial={{ rotateY: 90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: -90 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header with category color */}
            <div
              className="h-24 flex items-end p-4 relative"
              style={{ background: `linear-gradient(135deg, ${categoryColor}cc, ${categoryColor}88)` }}
            >
              {/* Category badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/30">
                <span className="text-sm">{categoryIcon}</span>
                <span className="text-white text-[10px] font-bold uppercase tracking-wider">{publicCategory}</span>
              </div>

              {/* Difficulty as dots (NOT raw number) */}
              <div className="absolute top-3 right-3 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border ${
                      i < difficultyDots ? 'bg-white border-white' : 'bg-transparent border-white/40'
                    }`}
                  />
                ))}
              </div>

              <div>
                <h2 className="text-white font-bold text-lg leading-tight">
                  {challenge.name}
                </h2>
              </div>
            </div>

            <div className="bg-gradient-to-b from-amber-50 to-stone-100 px-4 py-3 space-y-3">
              {/* Problem description (narrative text) */}
              <p className="text-stone-600 text-sm leading-relaxed">
                {challenge.publicFace?.problemDescription || challenge.description}
              </p>

              {/* Flavor Text */}
              {challenge.flavorText && (
                <p className="italic text-stone-400 text-xs border-l-2 border-stone-300 pl-2">
                  "{challenge.flavorText}"
                </p>
              )}

              {/* Affected Zones */}
              {challenge.affectedZoneIds.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {challenge.affectedZoneIds.map((zoneId) => (
                    <span
                      key={zoneId}
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
                    >
                      {zoneId.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {/* Resources Required (display names, token icons) */}
              {costEntries.length > 0 && (
                <div className="bg-stone-100 rounded-xl p-3">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
                    Resources Needed
                  </h4>
                  <div className="flex gap-1.5 flex-wrap">
                    {costEntries.map(([resource, amount]) => (
                      <div
                        key={resource}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white text-xs font-semibold"
                        style={{ backgroundColor: RESOURCE_COLORS[resource] }}
                      >
                        <span className="inline-block rounded-full bg-white/30" style={{ width: 6, height: 6 }} />
                        <span>{RESOURCE_DISPLAY_NAMES[resource] || resource}</span>
                        <span className="bg-white/20 rounded px-1">{amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Series progress indicator */}
              {seriesProgress && (
                <div className="bg-stone-100 rounded-xl p-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-stone-600">Series Progress</span>
                    <span className={`font-bold ${
                      seriesProgress.cards.length >= challenge.requirements.minSeriesLength
                        ? 'text-green-600' : 'text-stone-800'
                    }`}>
                      {seriesProgress.cards.length}/{challenge.requirements.minSeriesLength}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">Unique Roles</span>
                    <span className={`font-bold ${
                      new Set(seriesProgress.cards.map(c => c.card.roleId)).size >= challenge.requirements.minUniqueRoles
                        ? 'text-green-600' : 'text-stone-800'
                    }`}>
                      {new Set(seriesProgress.cards.map(c => c.card.roleId)).size}/{challenge.requirements.minUniqueRoles}
                    </span>
                  </div>
                </div>
              )}

              {/* Escalation warning */}
              {challenge.escalationPerRound > 0 && (
                <div className="flex items-center gap-1 text-xs" style={{ color: categoryColor }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2L10 8H2L6 2Z" fill="currentColor" />
                  </svg>
                  <span className="font-semibold">Escalates +{challenge.escalationPerRound}/round</span>
                </div>
              )}

              {/* NOTE: No resolution criteria, outcomes, or point values shown to players (Fix 2) */}

              {/* Facilitator flip button */}
              {isFacilitator && (
                <button
                  className="w-full py-2 rounded-lg bg-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-300 transition-colors"
                  onClick={() => setShowBack(true)}
                >
                  Flip Card (Facilitator Only)
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          // Card Back — HIDDEN (Fix 2: Facilitator only)
          <motion.div
            key="back"
            className="bg-stone-800 px-4 py-4 space-y-3"
            initial={{ rotateY: -90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-amber-300 font-bold text-sm">FACILITATOR VIEW</h3>
              <button
                className="text-stone-400 text-xs hover:text-stone-200"
                onClick={() => setShowBack(false)}
              >
                Flip to Front
              </button>
            </div>

            {challenge.hiddenBack ? (
              <>
                <div>
                  <h4 className="text-xs font-bold text-stone-400 uppercase">Resolution Criteria</h4>
                  <p className="text-stone-200 text-sm mt-1">{challenge.hiddenBack.resolutionCriteria}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-400 uppercase">Outcomes</h4>
                  <div className="bg-emerald-900/30 rounded p-2">
                    <p className="text-emerald-400 text-xs font-bold">Full Success</p>
                    <p className="text-stone-300 text-xs">{challenge.hiddenBack.outcomes.full.description}</p>
                    <p className="text-emerald-300 text-[10px]">CWS +{challenge.hiddenBack.outcomes.full.cwsBonus} | {challenge.hiddenBack.outcomes.full.zoneEffect}</p>
                  </div>
                  <div className="bg-amber-900/30 rounded p-2">
                    <p className="text-amber-400 text-xs font-bold">Partial Success</p>
                    <p className="text-stone-300 text-xs">{challenge.hiddenBack.outcomes.partial.description}</p>
                    <p className="text-amber-300 text-[10px]">CWS +{challenge.hiddenBack.outcomes.partial.cwsBonus} | {challenge.hiddenBack.outcomes.partial.zoneEffect}</p>
                  </div>
                  <div className="bg-red-900/30 rounded p-2">
                    <p className="text-red-400 text-xs font-bold">Failure</p>
                    <p className="text-stone-300 text-xs">{challenge.hiddenBack.outcomes.fail.description}</p>
                    <p className="text-red-300 text-[10px]">CWS -{challenge.hiddenBack.outcomes.fail.cwsPenalty} | {challenge.hiddenBack.outcomes.fail.zoneEffect}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-stone-400 uppercase">DM Notes</h4>
                  <p className="text-stone-300 text-xs mt-1">{challenge.hiddenBack.dmNotes}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-500 uppercase">Research Tag:</span>
                  <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                    {challenge.hiddenBack.researchTag}
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* Fallback: show raw data */}
                <div>
                  <h4 className="text-xs font-bold text-stone-400 uppercase">Requirements</h4>
                  <p className="text-stone-300 text-xs">Difficulty: {challenge.difficulty}</p>
                  <p className="text-stone-300 text-xs">Min Series: {challenge.requirements.minSeriesLength}</p>
                  <p className="text-stone-300 text-xs">Min Roles: {challenge.requirements.minUniqueRoles}</p>
                </div>

                {challenge.successRewards.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-green-500 uppercase">Success Rewards</h4>
                    <ul className="space-y-0.5">
                      {challenge.successRewards.map((r, i) => (
                        <li key={i} className="text-xs text-green-300 capitalize">{r.type.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {challenge.failureConsequences.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-red-500 uppercase">Failure</h4>
                    <ul className="space-y-0.5">
                      {challenge.failureConsequences.map((c, i) => (
                        <li key={i} className="text-xs text-red-300 capitalize">{c.type.replace(/_/g, ' ')}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChallengeDisplay;
