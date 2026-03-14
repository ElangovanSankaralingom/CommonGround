import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type {
  SeriesInProgress,
  CombinationInProgress,
  ChallengeCard,
  ResourceType,
} from '../../core/models/types';
import ActionCardDisplay from './ActionCardDisplay';
import { RESOURCE_COLORS } from './ActionCardDisplay';

const ROLE_COLORS: Record<string, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

interface StagingAreaProps {
  series: SeriesInProgress | null;
  combination: CombinationInProgress | null;
  challenge: ChallengeCard;
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * Checks whether two adjacent cards share at least one tag.
 */
function sharesTag(tagsA: string[], tagsB: string[]): boolean {
  return tagsA.some((t) => tagsB.includes(t));
}

const StagingArea: React.FC<StagingAreaProps> = ({
  series,
  combination,
  challenge,
  onComplete,
  onCancel,
}) => {
  // Series validation
  const seriesValid = useMemo(() => {
    if (!series) return false;
    return (
      series.cards.length >= challenge.requirements.minSeriesLength &&
      new Set(series.cards.map((c) => c.card.roleId)).size >=
        challenge.requirements.minUniqueRoles
    );
  }, [series, challenge]);

  // Combination total resources
  const comboTotals = useMemo(() => {
    if (!combination) return null;
    const totals: Partial<Record<ResourceType, number>> = {};
    for (const contrib of combination.contributions) {
      for (const [res, amt] of Object.entries(contrib.resources)) {
        const key = res as ResourceType;
        totals[key] = (totals[key] || 0) + (amt || 0);
      }
    }
    return totals;
  }, [combination]);

  const comboValid = useMemo(() => {
    if (!combination || !comboTotals) return false;
    const req = challenge.requirements.resourceCost;
    return Object.entries(req).every(([res, needed]) => {
      return (comboTotals[res as ResourceType] || 0) >= (needed || 0);
    });
  }, [combination, comboTotals, challenge]);

  const isValid = series ? seriesValid : comboValid;

  return (
    <motion.div
      className="w-full bg-gradient-to-b from-amber-50/95 to-stone-100/95 backdrop-blur-sm
                 rounded-2xl shadow-xl border border-stone-200 p-5"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-stone-700">
          {series ? 'Series Formation' : 'Resource Combination'}
        </h3>
        <span className="text-sm text-stone-500">
          Target: <span className="font-semibold">{challenge.name}</span>
        </span>
      </div>

      {/* Series View */}
      {series && (
        <div className="space-y-3">
          {/* Card Chain */}
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {series.cards.map((entry, i) => {
              const roleColor = ROLE_COLORS[entry.card.roleId] || '#666';
              const prevCard = i > 0 ? series.cards[i - 1].card : null;
              const tagMatch = prevCard
                ? sharesTag(prevCard.tags, entry.card.tags)
                : false;

              return (
                <React.Fragment key={entry.card.id}>
                  {/* Connecting arrow between cards */}
                  {i > 0 && (
                    <div className="flex flex-col items-center mx-1 flex-shrink-0">
                      <div
                        className={`w-8 h-0.5 ${
                          tagMatch ? 'bg-green-400' : 'bg-stone-300'
                        }`}
                      />
                      {tagMatch ? (
                        <span className="text-green-500 text-xs mt-0.5" title="Tags match">
                          &#10003;
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs mt-0.5" title="No shared tags">
                          &mdash;
                        </span>
                      )}
                    </div>
                  )}
                  <motion.div
                    className="flex-shrink-0"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <ActionCardDisplay
                      card={entry.card}
                      roleColor={roleColor}
                      compact
                    />
                  </motion.div>
                </React.Fragment>
              );
            })}

            {/* Empty slot indicator */}
            {series.cards.length < challenge.requirements.minSeriesLength && (
              <div className="flex-shrink-0 ml-2">
                <div
                  className="rounded-xl border-2 border-dashed border-stone-300
                             flex items-center justify-center text-stone-400 text-xs"
                  style={{ width: 150, height: 210 }}
                >
                  + Add Card
                </div>
              </div>
            )}
          </div>

          {/* Series Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="bg-stone-100 rounded-lg px-3 py-1.5">
              <span className="text-stone-500">Value: </span>
              <span className="font-bold text-stone-700">{series.currentValue}</span>
            </div>
            <div className="bg-stone-100 rounded-lg px-3 py-1.5">
              <span className="text-stone-500">Cards: </span>
              <span className="font-bold text-stone-700">
                {series.cards.length} / {challenge.requirements.minSeriesLength}
              </span>
            </div>
            <div className="bg-stone-100 rounded-lg px-3 py-1.5">
              <span className="text-stone-500">Roles: </span>
              <span className="font-bold text-stone-700">
                {new Set(series.cards.map((c) => c.card.roleId)).size}
                {' / '}
                {challenge.requirements.minUniqueRoles}
              </span>
            </div>
            {series.coalitionPactActive && (
              <span className="bg-blue-100 text-blue-700 rounded-lg px-3 py-1.5 font-semibold">
                Coalition Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Combination View */}
      {combination && comboTotals && (
        <div className="space-y-3">
          {/* Contributed Resources Stacked */}
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(RESOURCE_COLORS) as ResourceType[]).map((resource) => {
              const total = comboTotals[resource] || 0;
              const required =
                (challenge.requirements.resourceCost[resource] as number) || 0;
              const met = total >= required;

              if (required === 0 && total === 0) return null;

              return (
                <div
                  key={resource}
                  className={`rounded-lg p-2 text-center border-2 ${
                    met
                      ? 'border-green-300 bg-green-50'
                      : 'border-stone-200 bg-stone-50'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-1"
                    style={{ backgroundColor: RESOURCE_COLORS[resource] }}
                  />
                  <p className="capitalize text-xs font-medium text-stone-600">
                    {resource}
                  </p>
                  <p className="text-lg font-bold text-stone-800">
                    {total}
                    <span className="text-stone-400 text-sm">/{required}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Contributors */}
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">
              Contributors
            </h4>
            {combination.contributions.map((contrib, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm bg-stone-100 rounded px-2 py-1"
              >
                <span className="font-medium text-stone-700">
                  Player {contrib.playerId}
                </span>
                <div className="flex gap-1">
                  {Object.entries(contrib.resources)
                    .filter(([, v]) => v && v > 0)
                    .map(([res, amt]) => (
                      <span
                        key={res}
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5
                                   text-white text-xs font-semibold"
                        style={{
                          backgroundColor: RESOURCE_COLORS[res as ResourceType],
                        }}
                      >
                        {amt}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          className="flex-1 py-2.5 rounded-xl font-bold text-sm text-stone-500
                     bg-stone-200 hover:bg-stone-300 transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white
                      transition-colors ${
                        isValid
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-stone-400 cursor-not-allowed opacity-50'
                      }`}
          disabled={!isValid}
          onClick={onComplete}
        >
          {series ? 'Complete Series' : 'Complete Combination'}
        </button>
      </div>
    </motion.div>
  );
};

export default StagingArea;
