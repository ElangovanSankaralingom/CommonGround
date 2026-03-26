/**
 * GameplayPipeline — Complete Deliberation-to-Action-Resolution pipeline.
 *
 * Sub-phases: Clarification → Deliberation → Action Phase → Resolution
 * Each is a distinct UI screen with its own layout and transitions.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameSession, Player, ChallengeCard, ActionCard, RoleId, ResourceType, AbilityScores } from '../../core/models/types';
import { getAbilityModifier } from '../../core/models/types';
import {
  OBJECTIVE_WEIGHTS, BUCHI_OBJECTIVES, SURVIVAL_THRESHOLDS, WELFARE_WEIGHTS,
  PLAYER_TYPE, ROLE_COLORS, OBJECTIVE_ZONE_MAP, GRADUATED_OUTCOMES, NASH_PARAMS,
  SKILL_ABILITY_MAP, TAG_ABILITY_MAP,
  type ObjectiveId,
} from '../../core/models/constants';
import { calculateObjectiveSatisfaction, calculateAllUtilities, calculateCWS, checkNashQ1, checkNashQ3 } from '../../core/engine/nashEngine';

type SubPhase = 'clarification' | 'deliberation' | 'action' | 'resolution';

interface GameplayPipelineProps {
  session: GameSession;
  activeChallenge: ChallengeCard;
  players: Player[];
  currentPhase: string;
  onAdvancePhase: () => void;
  onPlayCard: (cardId: string, zoneId?: string) => void;
  onPassTurn: () => void;
  onProposeTrade: (targetId: string, offering: Partial<Record<ResourceType, number>>, requesting: Partial<Record<ResourceType, number>>) => void;
  onEndDeliberation: () => void;
  currentPlayer: Player | null;
  deliberationTimeRemaining: number;
}

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'Admin', investor: 'Investor', designer: 'Designer', citizen: 'Citizen', advocate: 'Advocate',
};

const ROLE_ICONS: Record<RoleId, string> = {
  administrator: '\u{1F3DB}', designer: '\u{1F4D0}', citizen: '\u{1F91D}', investor: '\u{1F4B0}', advocate: '\u{1F33F}',
};

const OBJ_LABELS: Record<ObjectiveId, string> = {
  safety: 'Safety', greenery: 'Greenery', access: 'Access', culture: 'Culture', revenue: 'Revenue', community: 'Community',
};

const ALL_OBJECTIVES: ObjectiveId[] = ['safety', 'greenery', 'access', 'culture', 'revenue', 'community'];

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '\u{1F4B0}', influence: '\u{1F451}', volunteer: '\u{1F465}', material: '\u{1F9F1}', knowledge: '\u{1F4DA}',
};

export function GameplayPipeline({
  session, activeChallenge, players, currentPhase,
  onAdvancePhase, onPlayCard, onPassTurn, onProposeTrade, onEndDeliberation,
  currentPlayer, deliberationTimeRemaining,
}: GameplayPipelineProps) {

  // Determine which sub-phase to show based on game phase
  const subPhase: SubPhase = useMemo(() => {
    if (currentPhase === 'event_roll') return 'clarification';
    if (currentPhase === 'deliberation') return 'deliberation';
    if (currentPhase === 'individual_action' || currentPhase === 'action_resolution') return 'action';
    if (currentPhase === 'round_end_accounting') return 'resolution';
    return 'clarification';
  }, [currentPhase]);

  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(new Set());
  const [seriesCards, setSeriesCards] = useState<{ card: ActionCard; playerId: string }[]>(
    session.activeSeries?.cards || []
  );

  // Objective satisfaction
  const satObjectives = useMemo(() => calculateObjectiveSatisfaction(session.board.zones), [session.board.zones]);
  const utilities = useMemo(() => calculateAllUtilities(session.players, satObjectives), [session.players, satObjectives]);

  const threshold = activeChallenge.difficulty;
  const targetZone = activeChallenge.affectedZoneIds[0] || '';

  // Series value calculation
  const seriesValue = useMemo(() => {
    let total = 0;
    for (const sc of seriesCards) {
      const player = players.find(p => p.id === sc.playerId);
      if (!player) continue;
      const tag = sc.card.tags[0] || '';
      const abilityKey = TAG_ABILITY_MAP[tag] || 'adaptability';
      total += sc.card.baseValue + getAbilityModifier(player.abilities[abilityKey] || 10);
    }
    const uniqueRoles = new Set(seriesCards.map(sc => players.find(p => p.id === sc.playerId)?.roleId));
    const multiRoleBonus = uniqueRoles.size >= 3 ? 3 : 0;
    const coalitionBonus = session.activeCoalitions.length > 0 ? 2 : 0;
    return total + multiRoleBonus + coalitionBonus;
  }, [seriesCards, players, session.activeCoalitions]);

  const margin = seriesValue - threshold;
  const outcome = margin >= 5 ? 'full' : margin >= 1 ? 'partial' : margin === 0 ? 'narrow' : 'failure';

  // ═══════════════════════════════════════════════════════════
  // SUB-PHASE 1: CLARIFICATION
  // ═══════════════════════════════════════════════════════════
  if (subPhase === 'clarification') {
    const questions = [
      {
        q: 'What are the consequences if this challenge is not resolved?',
        getAnswer: () => {
          if (activeChallenge.failureConsequences.length === 0) return 'No specific penalties listed.';
          return activeChallenge.failureConsequences
            .map(c => c.type.replace(/_/g, ' '))
            .join(', ') + '. Zone condition may degrade, SVS penalty applies.';
        },
      },
      {
        q: 'Which stakeholders are best positioned to address this?',
        getAnswer: () => {
          const checks = activeChallenge.requirements.abilityChecks;
          if (checks.length === 0) return 'Any player can contribute to this challenge.';
          return checks.map(check => {
            const results = players.map(p => {
              const score = p.abilities[check.ability] || 10;
              const passes = score >= check.threshold;
              return `${ROLE_NAMES[p.roleId]} (${check.ability.slice(0, 3).toUpperCase()}=${score} ${passes ? '\u2265' : '<'} ${check.threshold} ${passes ? '\u2713' : '\u2717'})`;
            });
            return results.join(' | ');
          }).join('\n');
        },
      },
      {
        q: 'Can this challenge be partially resolved?',
        getAnswer: () =>
          'Full Success (exceed by 5+): +2 zone levels, full SVS bonus\n' +
          'Partial Success (exceed by 1-4): +1 zone level, 60% bonus\n' +
          'Narrow Success (exact match): +1 zone level, 40% bonus, extra cost\n' +
          'Failure: consequences apply, difficulty escalates +2 next season',
      },
    ];

    return (
      <motion.div
        className="p-4 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-amber-300">Clarification Phase</h2>
          <span className="text-stone-500 text-xs">Up to 3 questions before deliberation</span>
        </div>

        {/* Challenge Card summary */}
        <div className="bg-stone-700/30 rounded-xl p-4 border border-stone-600/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-stone-200">{activeChallenge.name}</span>
            <span className="text-xs text-stone-500">Threshold: {threshold}</span>
            <span className="text-xs text-stone-500">Zone: {targetZone.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-stone-400 text-xs">{activeChallenge.description}</p>
        </div>

        {/* Question cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {questions.map((q, i) => {
            const isRevealed = revealedQuestions.has(i);
            return (
              <motion.div
                key={i}
                className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  isRevealed ? 'bg-stone-700/30 border-amber-500/30' : 'bg-stone-800/50 border-stone-600/30 hover:border-stone-500'
                }`}
                onClick={() => !isRevealed && setRevealedQuestions(prev => new Set(prev).add(i))}
                whileHover={!isRevealed ? { scale: 1.02 } : {}}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400 text-xs font-bold">Q{i + 1}</span>
                  {isRevealed && <span className="text-emerald-400 text-xs">{'\u2713'} Answered</span>}
                </div>
                <p className="text-stone-300 text-sm mb-2">{q.q}</p>
                <AnimatePresence>
                  {isRevealed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-stone-600/50 pt-2 mt-2"
                    >
                      <p className="text-stone-400 text-xs whitespace-pre-line">{q.getAnswer()}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!isRevealed && (
                  <p className="text-stone-600 text-xs italic">Click to reveal answer</p>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-400 text-stone-900 hover:bg-amber-300 shadow-lg transition-all"
            onClick={onAdvancePhase}
          >
            Proceed to Deliberation {'\u2192'}
          </button>
        </div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SUB-PHASE 2: DELIBERATION
  // ═══════════════════════════════════════════════════════════
  if (subPhase === 'deliberation') {
    const timerMins = Math.floor(deliberationTimeRemaining / 60);
    const timerSecs = deliberationTimeRemaining % 60;
    const isTimeLow = deliberationTimeRemaining <= 60;

    return (
      <motion.div
        className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* 2A: Objective Visibility — Horizontal Player Cards */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {players.map(p => {
            const weights = OBJECTIVE_WEIGHTS[p.roleId];
            const u = utilities[p.roleId] || 0;
            const t = SURVIVAL_THRESHOLDS[p.roleId];
            const belowThreshold = u < t;
            const buchiObjs = BUCHI_OBJECTIVES[p.roleId] || [];
            const playerType = PLAYER_TYPE[p.roleId];

            return (
              <div
                key={p.id}
                className={`flex-shrink-0 w-44 rounded-xl p-3 border-2 ${belowThreshold ? 'border-red-500/50 bg-red-900/10' : 'border-stone-600/30 bg-stone-800/30'}`}
                style={{ borderColor: belowThreshold ? undefined : `${ROLE_COLORS[p.roleId]}33` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{ROLE_ICONS[p.roleId]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: ROLE_COLORS[p.roleId] }}>{p.name}</p>
                    <p className="text-[9px] text-stone-500">{ROLE_NAMES[p.roleId]}</p>
                  </div>
                  <span className={`text-[8px] px-1 py-0.5 rounded ${playerType === 'S-FIXED' ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                    {playerType === 'S-FIXED' ? 'Guided' : 'Free'}
                  </span>
                </div>

                {/* Mini objective bars */}
                <div className="space-y-0.5 mb-2">
                  {ALL_OBJECTIVES.map(obj => {
                    const w = weights[obj];
                    const maxW = 5;
                    const pct = Math.max(0, (Math.abs(w) / maxW) * 100);
                    return (
                      <div key={obj} className="flex items-center gap-1">
                        <span className="text-[8px] text-stone-500 w-8 truncate">{OBJ_LABELS[obj].slice(0, 4)}</span>
                        <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${w < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%`, backgroundColor: w >= 0 ? ROLE_COLORS[p.roleId] : undefined }} />
                        </div>
                        <span className={`text-[8px] w-4 text-right ${w < 0 ? 'text-red-400' : 'text-stone-400'}`}>{w}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Utility gauge */}
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] text-stone-500">u=</span>
                  <span className={`text-sm font-bold ${belowThreshold ? 'text-red-400' : 'text-stone-200'}`}>{u}</span>
                  <span className="text-[9px] text-stone-600">/T={t}</span>
                </div>

                {/* Büchi dots */}
                <div className="flex gap-1">
                  {buchiObjs.map(obj => (
                    <span key={obj} className={`w-2 h-2 rounded-full ${satObjectives[obj] ? 'bg-emerald-500' : 'bg-red-500'}`} title={`${OBJ_LABELS[obj]}: ${satObjectives[obj] ? 'in sat' : 'NOT in sat'}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2B: Series Builder */}
        <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-600/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Series Builder — {activeChallenge.name} — Threshold: {'\u2265'} {threshold}
            </h3>
            <div className={`text-xs font-bold px-2 py-0.5 rounded ${margin >= 5 ? 'bg-emerald-900/30 text-emerald-400' : margin >= 0 ? 'bg-amber-900/30 text-amber-400' : 'bg-red-900/30 text-red-400'}`}>
              {seriesValue} / {threshold}
            </div>
          </div>

          {/* Series slots */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[0, 1, 2, 3].map(slotIdx => {
              const sc = seriesCards[slotIdx];
              const player = sc ? players.find(p => p.id === sc.playerId) : null;
              return (
                <div key={slotIdx} className={`flex-shrink-0 w-40 h-24 rounded-lg border-2 border-dashed flex items-center justify-center ${sc ? 'border-solid bg-stone-700/50' : 'border-stone-600/50'}`} style={sc && player ? { borderColor: `${ROLE_COLORS[player.roleId]}66` } : undefined}>
                  {sc && player ? (
                    <div className="p-2 text-center">
                      <p className="text-[10px] font-semibold" style={{ color: ROLE_COLORS[player.roleId] }}>{ROLE_NAMES[player.roleId]}</p>
                      <p className="text-xs text-stone-200 font-medium mt-0.5">{sc.card.name}</p>
                      <p className="text-[9px] text-stone-500 mt-0.5">
                        Base: {sc.card.baseValue} + Mod: {getAbilityModifier(player.abilities[TAG_ABILITY_MAP[sc.card.tags[0] || ''] || 'adaptability'] || 10)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-stone-600 text-xs">Slot {slotIdx + 1}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-stone-700 rounded-full overflow-hidden mt-2 relative">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: margin >= 5 ? '#22C55E' : margin >= 0 ? '#EAB308' : '#EF4444' }}
              animate={{ width: `${Math.min(100, (seriesValue / Math.max(threshold, 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2E: Büchi Warnings */}
        {(() => {
          const warnings = players.filter(p => {
            const buchiObjs = BUCHI_OBJECTIVES[p.roleId] || [];
            return buchiObjs.some(obj => !satObjectives[obj]);
          });
          if (warnings.length === 0) return null;
          return (
            <div className="bg-orange-900/20 border border-orange-700/40 rounded-xl p-3">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">{'\u26A0\uFE0F'} Buchi Urgency</h4>
              <div className="space-y-1">
                {warnings.map(p => {
                  const violated = (BUCHI_OBJECTIVES[p.roleId] || []).filter(obj => !satObjectives[obj]);
                  return (
                    <p key={p.id} className="text-xs text-orange-300">
                      <span className="font-semibold" style={{ color: ROLE_COLORS[p.roleId] }}>{ROLE_NAMES[p.roleId]}</span>: {violated.map(o => OBJ_LABELS[o]).join(', ')} not in sat — must be addressed
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 2F: Utility Preview */}
        <div className="bg-stone-800/50 rounded-xl p-3 border border-stone-600/30">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Utility Preview (if series succeeds)</h3>
          <div className="grid grid-cols-5 gap-2">
            {players.map(p => {
              const currentU = utilities[p.roleId] || 0;
              const t = SURVIVAL_THRESHOLDS[p.roleId];
              // Estimate: if target zone becomes fair+, which objectives flip?
              const zoneObjectives: ObjectiveId[] = [];
              for (const [objId, zoneIds] of Object.entries(OBJECTIVE_ZONE_MAP) as [ObjectiveId, string[]][]) {
                if (zoneIds.includes(targetZone)) zoneObjectives.push(objId);
              }
              const potentialGain = zoneObjectives.reduce((s, obj) => {
                if (!satObjectives[obj]) return s + (OBJECTIVE_WEIGHTS[p.roleId]?.[obj] || 0);
                return s;
              }, 0);
              const projectedU = currentU + Math.max(0, potentialGain);
              return (
                <div key={p.id} className="text-center text-xs">
                  <span className="font-semibold" style={{ color: ROLE_COLORS[p.roleId] }}>{ROLE_NAMES[p.roleId]}</span>
                  <div className={`font-bold ${projectedU >= t ? 'text-emerald-400' : 'text-red-400'}`}>
                    {currentU} {'\u2192'} {projectedU} {potentialGain > 0 && <span className="text-emerald-300">(+{potentialGain})</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timer + End Deliberation */}
        <div className="flex items-center justify-between">
          <div className={`text-sm font-mono font-bold ${isTimeLow ? 'text-red-400 animate-pulse' : 'text-stone-300'}`}>
            {timerMins}:{timerSecs.toString().padStart(2, '0')}
          </div>
          <button
            className="px-6 py-2 rounded-xl text-sm font-bold bg-amber-400 text-stone-900 hover:bg-amber-300 shadow-lg"
            onClick={onEndDeliberation}
          >
            End Deliberation {'\u2192'} Action Phase
          </button>
        </div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SUB-PHASE 3: ACTION PHASE
  // ═══════════════════════════════════════════════════════════
  if (subPhase === 'action') {
    // Turn order: lowest utility first
    const turnOrder = [...players].sort((a, b) => (utilities[a.roleId] || 0) - (utilities[b.roleId] || 0));

    return (
      <motion.div
        className="p-4 space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-amber-300">Action Phase</h2>
          <span className="text-stone-500 text-xs">
            Turn Order: {turnOrder.map((p, i) => `${i + 1}. ${ROLE_NAMES[p.roleId]}(u=${utilities[p.roleId] || 0})`).join(' \u2192 ')}
          </span>
        </div>

        {/* Current player actions */}
        {currentPlayer && (
          <div className="bg-stone-800/50 rounded-xl p-4 border-2" style={{ borderColor: `${ROLE_COLORS[currentPlayer.roleId]}44` }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{ROLE_ICONS[currentPlayer.roleId]}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: ROLE_COLORS[currentPlayer.roleId] }}>{currentPlayer.name}</p>
                <p className="text-xs text-stone-500">{ROLE_NAMES[currentPlayer.roleId]} — u={utilities[currentPlayer.roleId] || 0}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <button
                className="p-3 rounded-lg bg-blue-600/20 border border-blue-600/50 text-blue-300 text-xs font-semibold hover:bg-blue-600/30 transition-all"
                onClick={() => {
                  // Play first card in hand as a simple action
                  if (currentPlayer.hand.length > 0) {
                    onPlayCard(currentPlayer.hand[0].id, targetZone);
                  }
                }}
                disabled={currentPlayer.hand.length === 0}
              >
                Play Card
              </button>
              <button className="p-3 rounded-lg bg-indigo-600/20 border border-indigo-600/50 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/30 transition-all" disabled>
                Contribute to Series
              </button>
              <button className="p-3 rounded-lg bg-purple-600/20 border border-purple-600/50 text-purple-300 text-xs font-semibold hover:bg-purple-600/30 transition-all" disabled>
                Contribute Resources
              </button>
              <button
                className="p-3 rounded-lg bg-amber-600/20 border border-amber-600/50 text-amber-300 text-xs font-semibold hover:bg-amber-600/30 transition-all"
                disabled={currentPlayer.uniqueAbilityUsesRemaining <= 0}
              >
                Unique Ability ({currentPlayer.uniqueAbilityUsesRemaining})
              </button>
              <button
                className="p-3 rounded-lg bg-stone-600/20 border border-stone-600/50 text-stone-300 text-xs font-semibold hover:bg-stone-500/30 transition-all"
                onClick={onPassTurn}
              >
                Pass (Draw 2)
              </button>
            </div>

            {/* Player's hand */}
            {currentPlayer.hand.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs text-stone-500 mb-2">Your Hand ({currentPlayer.hand.length} cards)</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {currentPlayer.hand.map(card => (
                    <div
                      key={card.id}
                      className="flex-shrink-0 w-32 bg-stone-700/50 rounded-lg p-2 border border-stone-600/30 cursor-pointer hover:border-amber-400/50 transition-all"
                      onClick={() => onPlayCard(card.id, targetZone)}
                    >
                      <p className="text-xs font-semibold text-stone-200">{card.name}</p>
                      <p className="text-[9px] text-stone-500 mt-0.5">Base: {card.baseValue} | Tags: {card.tags.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Series progress */}
        <div className="bg-stone-800/30 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400">Series Value: <span className="text-stone-200 font-bold">{seriesValue}</span> / {threshold}</span>
            <span className={`font-bold ${margin >= 5 ? 'text-emerald-400' : margin >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {margin >= 5 ? 'FULL SUCCESS' : margin >= 1 ? 'PARTIAL SUCCESS' : margin === 0 ? 'NARROW' : 'FAILURE'}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SUB-PHASE 4: RESOLUTION
  // ═══════════════════════════════════════════════════════════
  if (subPhase === 'resolution') {
    const ne = session.nashEngineOutput;
    const outcomeColor = outcome === 'full' ? '#22C55E' : outcome === 'partial' ? '#EAB308' : outcome === 'narrow' ? '#F97316' : '#EF4444';
    const outcomeLabel = outcome === 'full' ? 'FULL SUCCESS' : outcome === 'partial' ? 'PARTIAL SUCCESS' : outcome === 'narrow' ? 'NARROW SUCCESS' : 'FAILURE';

    return (
      <motion.div
        className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Outcome Banner */}
        <motion.div
          className="rounded-2xl p-6 text-center"
          style={{ backgroundColor: `${outcomeColor}15`, border: `2px solid ${outcomeColor}44` }}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
        >
          <h2 className="text-2xl font-serif font-bold" style={{ color: outcomeColor }}>{outcomeLabel}</h2>
          <p className="text-stone-400 text-sm mt-1">{activeChallenge.name}</p>
          {outcome === 'full' && <p className="text-emerald-400 text-xs mt-2">Zone improved 2 levels | Full SVS bonus | All contributors +3 CP</p>}
          {outcome === 'partial' && <p className="text-amber-400 text-xs mt-2">Zone improved 1 level | 60% SVS bonus | Contributors +2 CP</p>}
          {outcome === 'narrow' && <p className="text-orange-400 text-xs mt-2">Zone improved 1 level | 40% SVS bonus | Extra resource cost</p>}
          {outcome === 'failure' && <p className="text-red-400 text-xs mt-2">Zone degrades | Resources lost | Threshold escalates +2</p>}
        </motion.div>

        {/* Utility Before/After */}
        {ne && (
          <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-600/30">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Individual Utilities</h3>
            <div className="space-y-2">
              {players.map(p => {
                const u = ne.utilities[p.roleId] || 0;
                const t = SURVIVAL_THRESHOLDS[p.roleId];
                const w = WELFARE_WEIGHTS[p.roleId];
                // Show objective breakdown
                const objBreakdown = ALL_OBJECTIVES.map(obj => {
                  const weight = OBJECTIVE_WEIGHTS[p.roleId]?.[obj] || 0;
                  const inSat = ne.sat_objectives[obj];
                  return { obj, weight, inSat, contribution: inSat ? weight : 0 };
                });

                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-semibold" style={{ color: ROLE_COLORS[p.roleId] }}>{ROLE_NAMES[p.roleId]}</span>
                    <span className="text-stone-500 w-8">w={w}</span>
                    <div className="flex-1 flex gap-1">
                      {objBreakdown.map(o => (
                        <span key={o.obj} className={`px-1 rounded ${o.inSat && o.weight > 0 ? 'bg-emerald-900/30 text-emerald-400' : o.weight < 0 && o.inSat ? 'bg-red-900/30 text-red-400' : 'text-stone-600'}`}>
                          {OBJ_LABELS[o.obj].slice(0, 3)}({o.weight}){o.inSat ? '\u2713' : ''}
                        </span>
                      ))}
                    </div>
                    <span className={`font-bold ${u >= t ? 'text-emerald-400' : 'text-red-400'}`}>u={u}</span>
                    <span className="text-stone-600">/T={t}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CWS Calculation */}
        {ne && (
          <div className="bg-stone-800/50 rounded-xl p-4 border border-amber-700/30">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">SVS Calculation</h3>
            <div className="text-xs text-stone-300 font-mono space-y-1">
              <p>SVS = {players.map(p => `${WELFARE_WEIGHTS[p.roleId]}\u00D7${ne.utilities[p.roleId] || 0}`).join(' + ')} + Equity + CP</p>
              <p className="text-stone-400">= {ne.cws.weighted_sum} + {ne.cws.equity_bonus.toFixed(1)} + {ne.cws.cp_bonus}</p>
              <p className="text-lg font-bold text-amber-300">= {ne.cws.total.toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* Nash Check */}
        {ne && (
          <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-600/30">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Shared Balance Point Check</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className={`rounded-lg p-3 ${ne.nash_q1.passed ? 'bg-emerald-900/20 border border-emerald-700/50' : 'bg-red-900/20 border border-red-700/50'}`}>
                <span className="text-xs font-bold">Q1: Thresholds</span>
                <p className="text-[10px] text-stone-400 mt-1">{ne.nash_q1.details}</p>
              </div>
              <div className="rounded-lg p-3 bg-indigo-900/20 border border-indigo-700/50">
                <span className="text-xs font-bold">Q2: No Deviation</span>
                <p className="text-[10px] text-stone-400 mt-1">Ask: {ne.nash_q2_ask?.map((r: RoleId) => ROLE_NAMES[r]).join(', ')}</p>
              </div>
              <div className={`rounded-lg p-3 ${ne.nash_q3.passed ? 'bg-emerald-900/20 border border-emerald-700/50' : 'bg-red-900/20 border border-red-700/50'}`}>
                <span className="text-xs font-bold">Q3: Equity</span>
                <p className="text-[10px] text-stone-400 mt-1">Var={ne.nash_q3.variance?.toFixed(1)} | SVS={ne.cws.total.toFixed(1)}</p>
              </div>
            </div>
            {ne.dne_achieved && (
              <motion.div className="mt-3 text-center" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                <span className="px-6 py-2 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 text-sm font-bold animate-pulse">
                  SHARED BALANCE POINT ACHIEVED
                </span>
              </motion.div>
            )}
          </div>
        )}

        {/* Continue button */}
        <div className="flex justify-end">
          <button
            className="px-8 py-3 rounded-xl text-sm font-bold bg-amber-400 text-stone-900 hover:bg-amber-300 shadow-lg"
            onClick={onAdvancePhase}
          >
            {session.currentRound >= session.totalRounds ? 'End Game' : 'Continue to Next Season'} {'\u2192'}
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}
