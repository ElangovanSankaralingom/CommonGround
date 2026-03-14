import React from 'react';
import type {
  ChallengeCard,
  SeriesInProgress,
  CombinationInProgress,
  ResourceType,
} from '../../core/models/types';
import { RESOURCE_COLORS } from './ActionCardDisplay';

interface ChallengeDisplayProps {
  challenge: ChallengeCard;
  seriesProgress?: SeriesInProgress;
  combinationProgress?: CombinationInProgress;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  maintenance: 'from-amber-600 to-amber-800',
  ecological: 'from-emerald-600 to-emerald-800',
  social: 'from-rose-500 to-rose-700',
  infrastructure: 'from-slate-500 to-slate-700',
  commercial: 'from-orange-500 to-orange-700',
  safety: 'from-red-600 to-red-800',
  political: 'from-purple-600 to-purple-800',
};

const ChallengeDisplay: React.FC<ChallengeDisplayProps> = ({
  challenge,
  seriesProgress,
  combinationProgress,
}) => {
  const gradient = CATEGORY_GRADIENTS[challenge.category] || 'from-stone-500 to-stone-700';

  const costEntries = Object.entries(challenge.requirements.resourceCost).filter(
    ([, amount]) => amount !== undefined && amount > 0
  ) as [ResourceType, number][];

  return (
    <div
      className="w-full max-w-xs bg-gradient-to-b from-amber-50 to-stone-100
                 rounded-2xl shadow-lg border border-stone-200 overflow-hidden"
    >
      {/* Art Placeholder */}
      <div
        className={`h-28 bg-gradient-to-br ${gradient} flex items-end p-4 relative`}
      >
        <div className="absolute top-3 right-3 flex items-center justify-center
                        rounded-full bg-white/90 shadow-md font-black text-stone-800"
             style={{ width: 48, height: 48, fontSize: 22 }}>
          {challenge.difficulty}
        </div>
        <div>
          <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">
            {challenge.category}
          </span>
          <h2 className="text-white font-bold text-lg leading-tight">
            {challenge.name}
          </h2>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Description */}
        <p className="text-stone-600 text-sm leading-relaxed">
          {challenge.description}
        </p>

        {/* Flavor Text */}
        {challenge.flavorText && (
          <p className="italic text-stone-400 text-xs border-l-2 border-stone-300 pl-2">
            "{challenge.flavorText}"
          </p>
        )}

        {/* Affected Zones */}
        {challenge.affectedZoneIds.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">
              Affected Zones
            </h4>
            <div className="flex gap-1.5 flex-wrap">
              {challenge.affectedZoneIds.map((zoneId) => (
                <span
                  key={zoneId}
                  className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs
                             font-medium"
                >
                  {zoneId}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Requirements Breakdown */}
        <div className="bg-stone-100 rounded-xl p-3 space-y-2">
          <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide">
            Requirements
          </h4>

          {/* Min Series Length */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-600">Min Series Length</span>
            <span className="font-bold text-stone-800">
              {seriesProgress ? (
                <span
                  className={
                    seriesProgress.cards.length >= challenge.requirements.minSeriesLength
                      ? 'text-green-600'
                      : 'text-stone-800'
                  }
                >
                  {seriesProgress.cards.length}/
                </span>
              ) : null}
              {challenge.requirements.minSeriesLength}
            </span>
          </div>

          {/* Min Unique Roles */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-600">Min Unique Roles</span>
            <span className="font-bold text-stone-800">
              {seriesProgress ? (
                <span
                  className={
                    new Set(seriesProgress.cards.map((c) => c.card.roleId)).size >=
                    challenge.requirements.minUniqueRoles
                      ? 'text-green-600'
                      : 'text-stone-800'
                  }
                >
                  {new Set(seriesProgress.cards.map((c) => c.card.roleId)).size}/
                </span>
              ) : null}
              {challenge.requirements.minUniqueRoles}
            </span>
          </div>

          {/* Resource Cost */}
          {costEntries.length > 0 && (
            <div>
              <span className="text-stone-600 text-sm">Resources</span>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {costEntries.map(([resource, amount]) => (
                  <div
                    key={resource}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5
                               text-white text-xs font-semibold"
                    style={{ backgroundColor: RESOURCE_COLORS[resource] }}
                  >
                    <span
                      className="inline-block rounded-full bg-white/30"
                      style={{ width: 6, height: 6 }}
                    />
                    <span className="capitalize">{resource}</span>
                    <span className="bg-white/20 rounded px-1">{amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ability Checks */}
          {challenge.requirements.abilityChecks.length > 0 && (
            <div>
              <span className="text-stone-600 text-sm">Ability Checks</span>
              <div className="space-y-1 mt-1">
                {challenge.requirements.abilityChecks.map((check, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-amber-50
                               rounded px-2 py-1 text-xs"
                  >
                    <span className="capitalize font-medium text-stone-700">
                      {check.ability}
                      {check.skill && (
                        <span className="text-stone-400 ml-1">({check.skill})</span>
                      )}
                    </span>
                    <span className="font-bold text-amber-700">DC {check.threshold}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rounds Active & Escalation */}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-stone-500">Active: </span>
            <span className="font-bold text-stone-700">
              {challenge.roundsActive} round{challenge.roundsActive !== 1 ? 's' : ''}
            </span>
          </div>
          {challenge.escalationPerRound > 0 && (
            <div className="bg-red-100 text-red-700 rounded-full px-2.5 py-0.5 text-xs
                            font-semibold flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2L10 8H2L6 2Z" fill="currentColor" />
              </svg>
              Escalates +{challenge.escalationPerRound}/round
            </div>
          )}
        </div>

        {/* Success Rewards */}
        {challenge.successRewards.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">
              Success Rewards
            </h4>
            <ul className="space-y-0.5">
              {challenge.successRewards.map((reward, i) => (
                <li
                  key={i}
                  className="text-xs text-green-700 bg-green-50 rounded px-2 py-1
                             capitalize"
                >
                  {reward.type.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Failure Consequences */}
        {challenge.failureConsequences.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">
              Failure Consequences
            </h4>
            <ul className="space-y-0.5">
              {challenge.failureConsequences.map((consequence, i) => (
                <li
                  key={i}
                  className="text-xs text-red-700 bg-red-50 rounded px-2 py-1
                             capitalize"
                >
                  {consequence.type.replace(/_/g, ' ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengeDisplay;
