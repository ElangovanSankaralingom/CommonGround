import React from 'react';
import { motion } from 'framer-motion';
import type { ActionCard, RoleId, Player, ChallengeCard } from '../../core/models/types';
import { OBJECTIVE_WEIGHTS, BUCHI_OBJECTIVES, SURVIVAL_THRESHOLDS, WELFARE_WEIGHTS, ROLE_COLORS, OBJECTIVE_ZONE_MAP, type ObjectiveId } from '../../core/models/constants';
import { getAbilityModifier } from '../../core/models/types';

interface SeriesBuilderProps {
  players: Player[];
  activeChallenge: ChallengeCard | null;
  seriesCards: { card: ActionCard; playerId: string }[];
  coalitionBonus: number;
  multiRoleBonus: number;
}

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'Admin', investor: 'Investor', designer: 'Designer', citizen: 'Citizen', advocate: 'Advocate',
};

const OBJECTIVE_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Access', culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

export function SeriesBuilder({ players, activeChallenge, seriesCards, coalitionBonus, multiRoleBonus }: SeriesBuilderProps) {
  if (!activeChallenge) return null;

  const threshold = activeChallenge.difficulty;
  const uniqueRoles = new Set(seriesCards.map(sc => {
    const p = players.find(pl => pl.id === sc.playerId);
    return p?.roleId;
  }));

  // Calculate series value
  let runningTotal = 0;
  const cardContributions = seriesCards.map(sc => {
    const player = players.find(p => p.id === sc.playerId);
    const baseVal = sc.card.baseValue;
    // Find relevant ability for this card's primary tag
    const tag = sc.card.tags[0] || '';
    const abilityKey = tag === 'design' || tag === 'construction' || tag === 'assessment' || tag === 'ecological'
      ? 'technicalKnowledge'
      : tag === 'funding' || tag === 'commercial' ? 'resourcefulness'
      : tag === 'approval' || tag === 'policy' ? 'authority'
      : tag === 'community' ? 'communityTrust'
      : 'adaptability';
    const abilityScore = player?.abilities[abilityKey] || 10;
    const modifier = getAbilityModifier(abilityScore);
    const contribution = baseVal + modifier;
    runningTotal += contribution;

    return {
      card: sc.card,
      player,
      baseVal,
      modifier,
      contribution,
      runningTotal,
    };
  });

  const totalSeriesValue = runningTotal + coalitionBonus + multiRoleBonus;
  const diff = totalSeriesValue - threshold;
  const isAbove = diff >= 0;

  // Determine graduated outcome
  const outcome = diff >= 5 ? 'FULL SUCCESS' : diff >= 1 ? 'PARTIAL SUCCESS' : diff === 0 ? 'NARROW SUCCESS' : 'FAILURE';
  const outcomeColor = diff >= 5 ? '#22C55E' : diff >= 1 ? '#EAB308' : diff === 0 ? '#F97316' : '#EF4444';

  // Find which objectives the target zone supports
  const targetZone = activeChallenge.affectedZoneIds[0];
  const zoneObjectives: ObjectiveId[] = [];
  for (const [objId, zoneIds] of Object.entries(OBJECTIVE_ZONE_MAP) as [ObjectiveId, string[]][]) {
    if (zoneIds.includes(targetZone)) zoneObjectives.push(objId);
  }

  return (
    <div className="bg-stone-800/80 backdrop-blur-sm rounded-xl border border-stone-600/50 p-4 space-y-3">
      {/* Series Chain */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        <span className="text-xs text-stone-500 mr-2 flex-shrink-0">Series:</span>
        {cardContributions.map((cc, i) => (
          <React.Fragment key={cc.card.id}>
            {i > 0 && <span className="text-stone-600 mx-1">{'\u2192'}</span>}
            <motion.div
              className="flex-shrink-0 bg-stone-700/80 rounded-lg px-3 py-2 border border-stone-600/50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cc.player ? ROLE_COLORS[cc.player.roleId] : '#666' }} />
                <span className="text-xs text-stone-300 font-medium">{cc.card.name}</span>
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">
                Base: {cc.baseVal} + Mod: {cc.modifier >= 0 ? '+' : ''}{cc.modifier} = <span className="text-stone-300 font-bold">{cc.contribution}</span>
              </div>
            </motion.div>
          </React.Fragment>
        ))}
        {seriesCards.length === 0 && (
          <span className="text-stone-500 text-xs italic">No cards in series yet. Select cards during your turn.</span>
        )}
      </div>

      {/* Value vs Threshold */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-stone-400">Series Value</span>
            <span className="font-bold" style={{ color: isAbove ? '#22C55E' : '#EF4444' }}>{totalSeriesValue}</span>
          </div>
          <div className="h-3 bg-stone-700 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: isAbove ? '#22C55E' : '#EF4444' }}
              animate={{ width: `${Math.min(100, (totalSeriesValue / Math.max(threshold, 1)) * 100)}%` }}
            />
            {/* Threshold marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400" style={{ left: `${Math.min(100, (threshold / Math.max(totalSeriesValue, threshold)) * 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5">
            <span className="text-stone-500">Need: {'\u2265'} {threshold}</span>
            {coalitionBonus > 0 && <span className="text-indigo-400">+{coalitionBonus} alliance</span>}
            {multiRoleBonus > 0 && <span className="text-purple-400">+{multiRoleBonus} multi-role ({uniqueRoles.size} roles)</span>}
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: `${outcomeColor}22`, color: outcomeColor, border: `1px solid ${outcomeColor}44` }}>
          {outcome}
        </div>
      </div>

      {/* Objective Impact */}
      {zoneObjectives.length > 0 && seriesCards.length > 0 && (
        <div className="bg-stone-700/30 rounded-lg p-2">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider">If successful, satisfies:</span>
          <div className="flex gap-1.5 mt-1">
            {zoneObjectives.map(obj => {
              // Find which players benefit from this objective being satisfied
              const beneficiaries = players.filter(p => (OBJECTIVE_WEIGHTS[p.roleId]?.[obj] || 0) > 0);
              return (
                <div key={obj} className="bg-emerald-900/20 rounded px-2 py-1 text-xs">
                  <span className="text-emerald-400 font-semibold">{OBJECTIVE_LABELS[obj]}</span>
                  <div className="text-[9px] text-stone-500 mt-0.5">
                    {beneficiaries.map(p => `${ROLE_NAMES[p.roleId]}(+${OBJECTIVE_WEIGHTS[p.roleId]?.[obj]})`).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
