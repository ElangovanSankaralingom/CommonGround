import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import { PhaseIndicator, ROLE_COLORS } from '../hud/PhaseIndicator';
import { HexGrid } from '../board';
import CardHand from '../cards/CardHand';
import ChallengeDisplay from '../cards/ChallengeDisplay';
import StagingArea from '../cards/StagingArea';
import { GameGraphView } from '../components/GameGraphView';
import { NashDashboard } from '../components/NashDashboard';
import { ZoneInfoPanel } from '../components/ZoneInfoPanel';
import { FacilitatorDashboard } from '../components/FacilitatorDashboard';
import { SeriesBuilder } from '../components/SeriesBuilder';
import { BuchiWarningPanel } from '../components/BuchiWarningPanel';
import { GameplayPipeline } from '../components/GameplayPipeline';
import type { RoleId, ResourcePool, ResourceType, Player, Zone } from '../../core/models/types';
import { CHALLENGE_CATEGORY_COLORS, WELFARE_WEIGHTS, OBJECTIVE_WEIGHTS, BUCHI_OBJECTIVES, SURVIVAL_THRESHOLDS, PLAYER_TYPE, type ObjectiveId } from '../../core/models/constants';

// ── New Gamified Phase Components ─────────────────────────────────
import { EventRollPhase } from '../phases/EventRollPhase';
import { ChallengePhase } from '../phases/ChallengePhase';
import DeliberationPhase from '../phases/DeliberationPhase';
import BasketballPhase from '../phases/BasketballPhase';
import ScoringPhase from '../phases/ScoringPhase';
import RoundTransition from '../phases/RoundTransition';
import { PhaseTransitionCard } from '../effects/PhaseTransitionCard';
import { DeckDisplay } from '../effects/ResourceAnimation';
import type { NashEngineOutput } from '../../core/engine/nashEngine';

// ── Role metadata ────────────────────────────────────────────────

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'City Administrator',
  designer: 'Urban Designer',
  citizen: 'Community Organizer',
  investor: 'Private Investor',
  advocate: 'Environmental Advocate',
};

const ROLE_ICONS: Record<RoleId, string> = {
  administrator: '\u{1F3DB}',
  designer: '\u{1F4D0}',
  citizen: '\u{1F91D}',
  investor: '\u{1F4B0}',
  advocate: '\u{1F33F}',
};

const RESOURCE_COLOR_MAP: Record<ResourceType, string> = {
  budget: '#F59E0B',
  influence: '#8B5CF6',
  volunteer: '#10B981',
  material: '#6B7280',
  knowledge: '#3B82F6',
};

const RESOURCE_ICONS: Record<ResourceType, string> = {
  budget: '\u{1F4B0}',
  influence: '\u{1F451}',
  volunteer: '\u{1F465}',
  material: '\u{1F9F1}',
  knowledge: '\u{1F4DA}',
};

// ── Sub-components ──────────────────────────────────────────────

function PlayerPanel({ players, currentPlayerId }: { players: Player[]; currentPlayerId: string | null }) {
  return (
    <div className="flex flex-col gap-2 w-56 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-200px)]">
      {players.map((player) => {
        const isCurrent = player.id === currentPlayerId;
        const roleColor = ROLE_COLORS[player.roleId] || '#666';

        return (
          <motion.div
            key={player.id}
            className={`rounded-xl p-3 border-2 transition-all ${
              isCurrent ? 'shadow-lg' : 'border-transparent'
            }`}
            style={{
              backgroundColor: isCurrent ? `${roleColor}15` : 'rgba(41,37,36,0.5)',
              borderColor: isCurrent ? roleColor : 'transparent',
            }}
            animate={isCurrent ? { scale: 1.02 } : { scale: 1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ backgroundColor: roleColor }}
              >
                {ROLE_ICONS[player.roleId]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-stone-200 text-sm font-semibold truncate">{player.name}</p>
                <p className="text-xs truncate" style={{ color: roleColor }}>
                  {ROLE_NAMES[player.roleId]}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400">Lv {player.level}</p>
                <p className="text-xs text-amber-400 font-bold">{player.collaborationPoints} CP</p>
              </div>
            </div>

            {/* Resources */}
            <div className="grid grid-cols-5 gap-1">
              {(Object.entries(player.resources) as [ResourceType, number][]).map(([res, amt]) => (
                <div
                  key={res}
                  className="flex flex-col items-center"
                  title={`${res}: ${amt}`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px]"
                    style={{ backgroundColor: `${RESOURCE_COLOR_MAP[res]}33` }}
                  >
                    {RESOURCE_ICONS[res]}
                  </div>
                  <span className="text-[10px] text-stone-400 font-bold">{amt}</span>
                </div>
              ))}
            </div>

            {/* Utility bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-stone-500">Utility</span>
                <span className="text-stone-300 font-bold">{player.utilityScore}</span>
              </div>
              <div className="w-full h-1.5 bg-stone-700 rounded-full mt-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, player.utilityScore)}%`,
                    backgroundColor: roleColor,
                  }}
                />
              </div>
            </div>

            {/* Status effects */}
            {player.statusEffects.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {player.statusEffects.map((effect) => (
                  <span
                    key={effect.id}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/30"
                    title={effect.description}
                  >
                    {effect.name}
                  </span>
                ))}
              </div>
            )}

            {/* Crisis indicator */}
            {player.crisisState && (
              <div className="mt-1.5 text-[10px] text-red-400 font-semibold bg-red-900/30 rounded px-2 py-0.5 text-center">
                CRISIS
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function ActionBar({
  onAdvancePhase,
  onRollDie,
  onDrawChallenge,
  onStartDeliberation,
  onEndDeliberation,
  onPass,
  onTrade,
  onVote,
  onUseAbility,
  phase,
  canAct,
  abilityUsesRemaining,
  hasEventResult,
}: {
  onAdvancePhase: () => void;
  onRollDie: () => void;
  onDrawChallenge: () => void;
  onStartDeliberation: () => void;
  onEndDeliberation: () => void;
  onPass: () => void;
  onTrade: () => void;
  onVote: () => void;
  onUseAbility: () => void;
  phase: string;
  canAct: boolean;
  abilityUsesRemaining: number;
  hasEventResult?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {phase === 'payment_day' && (
        <button
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold
                     hover:bg-emerald-500 transition-colors shadow-md"
          onClick={onAdvancePhase}
        >
          Continue to Event Roll
        </button>
      )}
      {phase === 'event_roll' && !hasEventResult && (
        <button
          className="px-4 py-2 rounded-lg bg-amber-500 text-stone-900 text-sm font-bold
                     hover:bg-amber-400 transition-colors shadow-md"
          onClick={onRollDie}
        >
          Roll Event Die
        </button>
      )}
      {/* When event result is showing, the full results panel has the Continue button */}
      {(phase === 'individual_action' || phase === 'action_resolution') && canAct && (
        <>
          {abilityUsesRemaining > 0 && (
            <button
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold
                         hover:bg-purple-500 transition-colors shadow-md"
              onClick={onUseAbility}
            >
              Use Ability ({abilityUsesRemaining})
            </button>
          )}
          <button
            className="px-4 py-2 rounded-lg bg-stone-600 text-stone-300 text-sm font-semibold
                       hover:bg-stone-500 transition-colors"
            onClick={onPass}
          >
            {phase === 'individual_action' ? 'Pass (Draw 2)' : 'Pass Turn'}
          </button>
        </>
      )}
      {phase === 'deliberation' && (
        <>
          <button
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-bold
                       hover:bg-blue-400 transition-colors shadow-md"
            onClick={onTrade}
          >
            Propose Trade
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-bold
                       hover:bg-indigo-400 transition-colors shadow-md"
            onClick={() => useGameStore.setState({ showCoalitionModal: true })}
          >
            Form Coalition
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-bold
                       hover:bg-purple-400 transition-colors shadow-md"
            onClick={onVote}
          >
            Call Vote
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-stone-600 text-stone-200 text-sm font-bold
                       hover:bg-stone-500 transition-colors"
            onClick={onEndDeliberation}
          >
            End Deliberation
          </button>
        </>
      )}
      {(phase === 'round_end_accounting' || phase === 'level_check') && (
        <button
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold
                     hover:bg-emerald-500 transition-colors shadow-md ml-auto"
          onClick={onAdvancePhase}
        >
          Next Phase
        </button>
      )}
    </div>
  );
}

function CWSBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, (current / target) * 100);
  const color = pct >= 100 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-stone-400 uppercase tracking-wider font-semibold">CWS</span>
      <div className="w-40 h-4 bg-stone-700 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/50"
          style={{ left: '100%' }}
        />
      </div>
      <span className="text-sm font-bold text-stone-200">
        {current}/{target}
      </span>
    </div>
  );
}

function TimerDisplay({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isLow = seconds <= 30;

  return (
    <motion.div
      className={`flex items-center gap-1.5 text-sm font-mono font-bold ${
        isLow ? 'text-red-400' : 'text-stone-300'
      }`}
      animate={isLow ? { scale: [1, 1.05, 1] } : {}}
      transition={isLow ? { duration: 0.5, repeat: Infinity } : {}}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 3.5V7L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {mins}:{secs.toString().padStart(2, '0')}
    </motion.div>
  );
}

function PlayerHandoff({
  playerName,
  roleId,
  onDismiss,
}: {
  playerName: string;
  roleId: RoleId;
  onDismiss: () => void;
}) {
  const roleColor = ROLE_COLORS[roleId] || '#666';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-stone-800 rounded-2xl p-10 text-center border-2 shadow-2xl max-w-md"
        style={{ borderColor: roleColor }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <div className="text-5xl mb-4">{ROLE_ICONS[roleId]}</div>
        <h2 className="text-2xl font-serif font-bold" style={{ color: roleColor }}>
          {playerName}&apos;s Turn
        </h2>
        <p className="text-stone-400 mt-2 text-sm">{ROLE_NAMES[roleId]}</p>
        <p className="text-stone-500 mt-4 text-xs">
          Pass the device to {playerName} and press Ready
        </p>
        <motion.button
          className="mt-6 px-10 py-3 rounded-xl text-sm font-bold text-stone-900 shadow-lg"
          style={{ backgroundColor: roleColor }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDismiss}
        >
          Ready
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function TradeModal({
  players,
  currentPlayer,
  onPropose,
  onClose,
}: {
  players: Player[];
  currentPlayer: Player;
  onPropose: (targetId: string, offering: Partial<ResourcePool>, requesting: Partial<ResourcePool>) => void;
  onClose: () => void;
}) {
  const [targetId, setTargetId] = useState('');
  const [offering, setOffering] = useState<Partial<ResourcePool>>({});
  const [requesting, setRequesting] = useState<Partial<ResourcePool>>({});

  const otherPlayers = players.filter((p) => p.id !== currentPlayer.id);
  const resources: ResourceType[] = ['budget', 'influence', 'volunteer', 'material', 'knowledge'];

  const handleSubmit = useCallback(() => {
    if (!targetId) return;
    onPropose(targetId, offering, requesting);
  }, [targetId, offering, requesting, onPropose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-stone-800 rounded-2xl p-6 w-full max-w-lg border border-stone-600 shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h2 className="text-xl font-bold text-amber-300 mb-4">Propose Trade</h2>

        {/* Target selection */}
        <div className="mb-4">
          <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
            Trade With
          </label>
          <div className="flex gap-2 mt-2">
            {otherPlayers.map((p) => (
              <button
                key={p.id}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  targetId === p.id
                    ? 'text-white shadow-md'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
                style={
                  targetId === p.id
                    ? { backgroundColor: ROLE_COLORS[p.roleId] || '#666' }
                    : undefined
                }
                onClick={() => setTargetId(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Offering */}
        <div className="mb-4">
          <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
            You Offer
          </label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {resources.map((res) => (
              <div key={res} className="text-center">
                <span className="text-[10px] text-stone-400 capitalize">{res}</span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <button
                    className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs hover:bg-stone-600"
                    onClick={() =>
                      setOffering((prev) => ({
                        ...prev,
                        [res]: Math.max(0, (prev[res] || 0) - 1),
                      }))
                    }
                  >
                    -
                  </button>
                  <span className="text-sm font-bold text-stone-200 w-4 text-center">
                    {offering[res] || 0}
                  </span>
                  <button
                    className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs hover:bg-stone-600"
                    onClick={() =>
                      setOffering((prev) => ({
                        ...prev,
                        [res]: Math.min(currentPlayer.resources[res], (prev[res] || 0) + 1),
                      }))
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requesting */}
        <div className="mb-6">
          <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
            You Request
          </label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {resources.map((res) => (
              <div key={res} className="text-center">
                <span className="text-[10px] text-stone-400 capitalize">{res}</span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <button
                    className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs hover:bg-stone-600"
                    onClick={() =>
                      setRequesting((prev) => ({
                        ...prev,
                        [res]: Math.max(0, (prev[res] || 0) - 1),
                      }))
                    }
                  >
                    -
                  </button>
                  <span className="text-sm font-bold text-stone-200 w-4 text-center">
                    {requesting[res] || 0}
                  </span>
                  <button
                    className="w-5 h-5 rounded bg-stone-700 text-stone-300 text-xs hover:bg-stone-600"
                    onClick={() =>
                      setRequesting((prev) => ({
                        ...prev,
                        [res]: (prev[res] || 0) + 1,
                      }))
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-stone-700 text-stone-300
                       hover:bg-stone-600 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              targetId
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
            disabled={!targetId}
            onClick={handleSubmit}
          >
            Propose
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function VoteModal({
  onVote,
  onClose,
}: {
  onVote: (vote: boolean) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-stone-800 rounded-2xl p-8 text-center border border-stone-600 shadow-2xl max-w-sm"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <h2 className="text-xl font-bold text-amber-300 mb-2">Vote</h2>
        <p className="text-stone-400 text-sm mb-6">
          Do you approve the current proposal?
        </p>
        <div className="flex gap-4">
          <button
            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm
                       hover:bg-emerald-500 transition-colors"
            onClick={() => onVote(true)}
          >
            Approve
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm
                       hover:bg-red-500 transition-colors"
            onClick={() => onVote(false)}
          >
            Reject
          </button>
        </div>
        <button
          className="mt-4 text-stone-500 text-xs hover:text-stone-400 underline"
          onClick={onClose}
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

// Event Roll Results Panel — 1d6 per spec Part 3.1
function EventResultsPanel({
  eventDieResult,
  eventRollResult,
  players,
  onContinue,
}: {
  eventDieResult: { value: number; outcome: string } | null;
  eventRollResult: import('../../core/models/types').EventRollResult;
  players: Player[];
  onContinue: () => void;
}) {
  const { eventEntry, phaseTriggered, affectedPlayers: affectedPlayerIds } = eventRollResult;
  const dieValue = eventDieResult?.value || 0;
  const outcome = eventDieResult?.outcome || 'no_event';

  const isNegative = outcome === 'negative_event';
  const isPositive = outcome === 'positive_event';
  const isNeutral = outcome === 'no_event';
  const bgTint = isNegative ? 'from-red-900/20 to-stone-800'
    : isPositive ? 'from-emerald-900/20 to-stone-800'
    : 'from-stone-700/20 to-stone-800';
  const badgeColor = isNegative ? 'bg-red-500' : isPositive ? 'bg-emerald-500' : 'bg-stone-500';
  const badgeLabel = isNegative ? '\u26A0\uFE0F Negative Event' : isPositive ? '\u2B50 Positive Event' : '\u2796 Neutral \u2014 No External Event';

  // Resolve affected player names
  const affectedPlayerNames = affectedPlayerIds
    ? affectedPlayerIds.map((pid: string) => {
        const p = players.find((pl) => pl.id === pid);
        return p ? `${ROLE_NAMES[p.roleId]} (${p.name})` : pid;
      })
    : [];

  // Resolve required roles for deliberation display
  const requiredRoleNames = eventEntry.requiredPlayers === 'all'
    ? 'All 5 players'
    : (eventEntry.requiredPlayers as RoleId[]).map((r) => ROLE_NAMES[r]).join(', ');

  const nextPhaseName = phaseTriggered === 'individual_only' ? 'Individual Actions'
    : phaseTriggered === 'deliberation_partial' ? 'Deliberation (Partial)'
    : 'Deliberation (Full)';

  return (
    <motion.div
      className={`bg-gradient-to-b ${bgTint} rounded-2xl p-6 max-w-lg w-full border border-stone-600/50 shadow-2xl space-y-4`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15 }}
    >
      {/* a) THE ROLL — Single d6 */}
      <div className="text-center">
        <p className="text-stone-500 text-xs uppercase tracking-wider mb-2">Event Die (1d6)</p>
        <motion.div
          className={`w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-4xl font-black border-3 shadow-lg ${
            isNegative ? 'bg-red-900/30 border-red-500 text-red-300' :
            isPositive ? 'bg-emerald-900/30 border-emerald-500 text-emerald-300' :
            'bg-stone-600 border-stone-500 text-stone-200'
          }`}
          initial={{ rotateZ: -720, scale: 0 }}
          animate={{ rotateZ: 0, scale: 1 }}
          transition={{ duration: 0.8, type: 'spring', damping: 12 }}
        >
          {dieValue}
        </motion.div>
      </div>

      {/* b) EVENT NAME */}
      <motion.h2 className={`text-center text-xl font-serif font-bold ${isNegative ? 'text-red-400' : isPositive ? 'text-emerald-400' : 'text-stone-200'}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {eventEntry.name}
      </motion.h2>

      {/* c) EVENT TYPE BADGE */}
      <div className="text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>

      {/* d) ZONE EFFECT */}
      <div className="bg-stone-700/50 rounded-lg p-3">
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Zone Effect</h4>
        <p className="text-stone-200 text-sm">{eventEntry.zoneEffect}</p>
      </div>

      {/* e) PLAYER EFFECT */}
      <div className="bg-stone-700/50 rounded-lg p-3">
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Player Effect</h4>
        <p className="text-stone-200 text-sm">{eventEntry.playerEffect}</p>
        {affectedPlayerNames.length > 0 && affectedPlayerNames.length < players.length && (
          <p className="text-stone-500 text-xs mt-1">Affected: {affectedPlayerNames.join(', ')}</p>
        )}
      </div>

      {/* f) PHASE IMPACT */}
      <div className={`rounded-lg p-3 border ${
        phaseTriggered === 'deliberation_all' ? 'bg-purple-900/20 border-purple-600/30'
        : phaseTriggered === 'deliberation_partial' ? 'bg-indigo-900/20 border-indigo-600/30'
        : 'bg-stone-700/30 border-stone-600/30'
      }`}>
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">What Happens Next</h4>
        {phaseTriggered === 'deliberation_all' ? (
          <p className="text-purple-300 text-sm font-semibold">This event triggers FULL DELIBERATION — all 5 players must negotiate.</p>
        ) : phaseTriggered === 'deliberation_partial' ? (
          <p className="text-indigo-300 text-sm font-semibold">This event triggers PARTIAL DELIBERATION — {requiredRoleNames} must negotiate.</p>
        ) : (
          <p className="text-stone-300 text-sm font-semibold">No deliberation required — proceed to Individual Actions.</p>
        )}
      </div>

      {/* g) CONTINUE BUTTON */}
      <button
        className="w-full py-3 rounded-xl text-sm font-bold bg-amber-400 text-stone-900 hover:bg-amber-300 transition-colors shadow-lg"
        onClick={onContinue}
      >
        Continue to {nextPhaseName} \u2192
      </button>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function GameScreen() {
  const {
    session,
    selectedCardId,
    selectedZoneId,
    showHandoff,
    showTradeModal,
    showVoteModal,
    showGameGraph,
    showPaymentDay,
    showLevelUp,
    deliberationTimeRemaining,
    selectCard,
    selectZone,
    dismissHandoff,
    dismissPaymentDay,
    dismissLevelUp,
    advancePhase,
    rollEventDie,
    drawChallenge,
    startDeliberation,
    endDeliberation,
    playCard,
    passTurn,
    proposeTrade,
    castVote,
    useUniqueAbility,
    toggleGameGraph,
    getCurrentPlayer,
    getActiveChallenge,
  } = useGameStore();

  const [showStagingArea, setShowStagingArea] = useState(false);
  const [selectedZoneForPanel, setSelectedZoneForPanel] = useState<string | null>(null);
  const [showFacilitatorDashboard, setShowFacilitatorDashboard] = useState(false);

  // ── Gamified Flow State ────────────────────────────────────────
  const [gamifiedPhase, setGamifiedPhase] = useState<
    'event_roll' | 'challenge' | 'deliberation' | 'basketball' | 'scoring' | 'round_transition' | 'phase_transition' | null
  >(null);
  const [phaseTransition, setPhaseTransition] = useState<{
    from: number; to: number; fromName: string; toName: string;
  } | null>(null);
  const [lastNashOutput, setLastNashOutput] = useState<NashEngineOutput | null>(null);
  const [lastEndCondition, setLastEndCondition] = useState<string>('none');
  const [roundCPAwards, setRoundCPAwards] = useState<Record<string, { amount: number; reason: string }[]>>({});

  // Auto-activate gamified phases based on game phase
  // This is the FALLBACK — showPhaseTransition is the primary mechanism
  React.useEffect(() => {
    if (!session) return;
    // Don't interrupt phase transitions in progress
    if (gamifiedPhase === 'phase_transition') return;

    const phase = session.currentPhase;
    console.log('PHASE AUTO-ACTIVATE: session.currentPhase =', phase, '| gamifiedPhase =', gamifiedPhase);

    if (phase === 'payment_day') {
      // Payment Day handled by existing overlay, then manually transitions to event_roll
    } else if (phase === 'event_roll' && gamifiedPhase !== 'event_roll') {
      console.log('PHASE TRANSITION: auto-activating event_roll');
      setGamifiedPhase('event_roll');
    } else if (phase === 'deliberation' && gamifiedPhase !== 'deliberation') {
      console.log('PHASE TRANSITION: auto-activating deliberation');
      setGamifiedPhase('deliberation');
    } else if ((phase === 'individual_action' || phase === 'action_resolution') && gamifiedPhase !== 'basketball' && gamifiedPhase !== 'scoring') {
      if (getActiveChallenge()) {
        console.log('PHASE TRANSITION: auto-activating basketball');
        setGamifiedPhase('basketball');
      } else {
        console.log('PHASE TRANSITION: no challenge, skipping basketball → scoring');
        advancePhase();
      }
    } else if (phase === 'round_end_accounting' && gamifiedPhase !== 'scoring') {
      console.log('PHASE TRANSITION: auto-activating scoring');
      setGamifiedPhase('scoring');
    } else if (phase === 'level_check' && gamifiedPhase !== 'scoring') {
      console.log('PHASE TRANSITION: auto-activating scoring for level_check');
      setGamifiedPhase('scoring');
    } else if (phase === 'round_end' && gamifiedPhase !== 'round_transition') {
      console.log('PHASE TRANSITION: auto-activating round_transition');
      setGamifiedPhase('round_transition');
    } else if (phase === 'game_end' && gamifiedPhase !== 'round_transition') {
      console.log('PHASE TRANSITION: auto-activating round_transition for game_end');
      setLastEndCondition('time_ends');
      setGamifiedPhase('round_transition');
    }
  }, [session?.currentPhase, gamifiedPhase]);

  // Phase transition helper
  const showPhaseTransition = useCallback((from: number, to: number, fromName: string, toName: string, nextPhase: typeof gamifiedPhase) => {
    console.log(`PHASE TRANSITION: Phase ${from} (${fromName}) → Phase ${to} (${toName}) | next gamifiedPhase: ${nextPhase}`);
    setPhaseTransition({ from, to, fromName, toName });
    setGamifiedPhase('phase_transition');
    // After transition animation, switch to next phase
    setTimeout(() => {
      console.log(`PHASE TRANSITION COMPLETE: Now activating ${nextPhase}`);
      setPhaseTransition(null);
      setGamifiedPhase(nextPhase);
    }, 2200);
  }, []);

  if (!session) return null;

  const currentPlayer = getCurrentPlayer();
  const currentPhase = session.currentPhase;
  const players = Object.values(session.players);
  const zones = Object.values(session.board.zones);
  const activeChallenge = getActiveChallenge();
  const isActionPhase = currentPhase === 'individual_action' || currentPhase === 'action_resolution';
  const isDelibPhase = currentPhase === 'deliberation';

  // Build standee map for HexGrid
  const playerStandees = useMemo(() => {
    const map: Record<string, { roleId: string; color: string; icon: string }[]> = {};
    for (const zone of zones) {
      map[zone.id] = zone.playerStandees.map((pid) => {
        const p = session.players[pid];
        return {
          roleId: p?.roleId || 'administrator',
          color: ROLE_COLORS[p?.roleId || 'administrator'] || '#666',
          icon: ROLE_ICONS[(p?.roleId || 'administrator') as RoleId],
        };
      });
    }
    return map;
  }, [zones, session.players]);

  const handleCardPlay = useCallback(
    (cardId: string) => {
      playCard(cardId, selectedZoneId || undefined);
    },
    [playCard, selectedZoneId]
  );

  const handleZoneClick = useCallback(
    (zoneId: string) => {
      selectZone(zoneId === selectedZoneId ? null : zoneId);
      // Open zone info panel on click (Fix 2)
      setSelectedZoneForPanel(zoneId === selectedZoneForPanel ? null : zoneId);
    },
    [selectZone, selectedZoneId, selectedZoneForPanel]
  );

  const handleTradePropose = useCallback(
    (targetId: string, offering: Partial<ResourcePool>, requesting: Partial<ResourcePool>) => {
      proposeTrade(targetId, offering, requesting);
    },
    [proposeTrade]
  );

  return (
    <div className="w-full h-screen bg-stone-900 flex flex-col overflow-hidden">
      {/* Phase Indicator Bar */}
      <PhaseIndicator
        currentPhase={currentPhase}
        currentRound={session.currentRound}
        totalRounds={session.totalRounds}
        gameLevel={session.gameLevel}
      />

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ══ GAMIFIED PHASE OVERLAYS ════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════ */}

      {/* Phase Transition Card */}
      <AnimatePresence>
        {gamifiedPhase === 'phase_transition' && phaseTransition && (
          <PhaseTransitionCard
            fromPhase={phaseTransition.from}
            toPhase={phaseTransition.to}
            fromName={phaseTransition.fromName}
            toName={phaseTransition.toName}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Phase 1: Event Roll (gamified) */}
      {gamifiedPhase === 'event_roll' && (
        <div className="absolute inset-0 z-40">
          <EventRollPhase
            session={session}
            onPhaseComplete={() => {
              // Transition: Event Roll → Challenge
              if (activeChallenge) {
                showPhaseTransition(1, 2, 'Event Roll', 'Challenge', 'challenge');
              } else {
                // No challenge drawn, skip to deliberation
                showPhaseTransition(1, 3, 'Event Roll', 'Deliberation', 'deliberation');
              }
              advancePhase();
            }}
          />
        </div>
      )}

      {/* Phase 2: Challenge + Treasure Hunt (gamified) */}
      {gamifiedPhase === 'challenge' && activeChallenge && (
        <div className="absolute inset-0 z-40">
          <ChallengePhase
            session={session}
            challenge={activeChallenge}
            players={players}
            onPhaseComplete={(results) => {
              // Award CP from treasure hunt
              const cpAwards: Record<string, { amount: number; reason: string }[]> = {};
              for (const clue of results.cluesFound) {
                if (!cpAwards[clue.finderId]) cpAwards[clue.finderId] = [];
                cpAwards[clue.finderId].push({ amount: 1, reason: `Found ${clue.type} clue` });
              }
              if (results.allFound) {
                for (const p of players) {
                  if (!cpAwards[p.id]) cpAwards[p.id] = [];
                  cpAwards[p.id].push({ amount: 2, reason: 'All 5 clues found (team bonus)' });
                }
              }
              setRoundCPAwards(prev => {
                const merged = { ...prev };
                for (const [pid, awards] of Object.entries(cpAwards)) {
                  merged[pid] = [...(merged[pid] || []), ...awards];
                }
                return merged;
              });
              showPhaseTransition(2, 3, 'Challenge', 'Deliberation', 'deliberation');
            }}
          />
        </div>
      )}

      {/* Phase 3: I-Spy + Deliberation (gamified) */}
      {gamifiedPhase === 'deliberation' && (
        <div className="absolute inset-0 z-40">
          <DeliberationPhase
            session={session}
            players={players}
            currentPlayerId={currentPlayer?.id || players[0]?.id || ''}
            challenge={activeChallenge}
            onPhaseComplete={() => {
              showPhaseTransition(3, 4, 'Deliberation', 'Action', 'basketball');
              advancePhase();
            }}
            onProposeTrade={proposeTrade}
            onAcceptTrade={(tradeId) => useGameStore.getState().acceptTrade(tradeId)}
            onRejectTrade={(tradeId) => useGameStore.getState().rejectTrade(tradeId)}
            onFormCoalition={(partnerIds, targetZoneId) => useGameStore.getState().formCoalition(partnerIds, targetZoneId)}
            onMakePromise={(toPlayerId, resource, amount) => useGameStore.getState().makePromise(toPlayerId, resource, amount, session.currentRound + 1)}
            onEndDeliberation={endDeliberation}
            deliberationTimeRemaining={deliberationTimeRemaining}
          />
        </div>
      )}

      {/* Phase 4: Basketball Action Resolution (gamified) */}
      {gamifiedPhase === 'basketball' && activeChallenge && (
        <div className="absolute inset-0 z-40">
          <BasketballPhase
            session={session}
            players={players}
            challenge={activeChallenge}
            onPhaseComplete={(result: any) => {
              // Log resolution telemetry
              console.log('Basketball resolution:', result);
              setRoundCPAwards(prev => {
                const merged = { ...prev };
                if (result.teamPlayBonus) {
                  for (const p of players) {
                    if (!merged[p.id]) merged[p.id] = [];
                    merged[p.id].push({ amount: 1, reason: 'Team play bonus (all contributed)' });
                  }
                }
                return merged;
              });
              showPhaseTransition(4, 5, 'Action', 'Scoring', 'scoring');
              advancePhase();
            }}
            onPlayCard={(cardId: string, targetZoneId?: string) => playCard(cardId, targetZoneId)}
            onPassTurn={passTurn}
            onUseAbility={() => useUniqueAbility()}
          />
        </div>
      )}

      {/* Phase 5: Scoring (gamified) */}
      {gamifiedPhase === 'scoring' && (
        <div className="absolute inset-0 z-40">
          <ScoringPhase
            session={session}
            players={players}
            roundCPAwards={roundCPAwards}
            onPhaseComplete={(nashOutput, endCondition) => {
              setLastNashOutput(nashOutput);
              setLastEndCondition(endCondition);
              setGamifiedPhase('round_transition');
              advancePhase();
            }}
          />
        </div>
      )}

      {/* Round Transition / End Game */}
      {gamifiedPhase === 'round_transition' && (
        <div className="absolute inset-0 z-40">
          <RoundTransition
            session={session}
            endCondition={lastEndCondition as any}
            nashOutput={lastNashOutput}
            onNextRound={() => {
              setGamifiedPhase(null);
              setRoundCPAwards({});
              advancePhase(); // Advances to next round's payment_day
            }}
            onDebrief={() => {
              setGamifiedPhase(null);
              advancePhase(); // Advances to debrief
            }}
          />
        </div>
      )}

      {/* Deck Displays (always visible during gameplay) */}
      {session.status === 'playing' && (
        <div className="absolute top-16 left-4 z-15 flex flex-col gap-2">
          <DeckDisplay
            label="Event Deck"
            remaining={session.decks.eventDeck.length}
            discarded={session.decks.eventDiscard.length}
            cardBackColor="#DC2626"
          />
          <DeckDisplay
            label="Challenge Deck"
            remaining={session.decks.challengeDeck.length}
            discarded={session.decks.challengeDiscard.length}
            cardBackColor="#D97706"
          />
        </div>
      )}

      {/* Legacy Event Roll Results Panel (fallback when gamified is not active) */}
      <AnimatePresence>
        {gamifiedPhase === null && currentPhase === 'event_roll' && session.eventRollResult && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EventResultsPanel
              eventDieResult={session.eventDieResult}
              eventRollResult={session.eventRollResult as any}
              players={players}
              onContinue={() => {
                console.log('Event roll continue: phaseTriggered =', session.eventRollResult?.phaseTriggered);
                advancePhase();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD Buttons (top-right) */}
      <div className="absolute top-16 right-4 z-20 flex flex-col gap-2">
        {/* Facilitator Dashboard Button */}
        <button
          className="w-10 h-10 rounded-full bg-stone-700/80 border border-stone-600 flex items-center justify-center hover:bg-stone-600 transition-colors"
          onClick={() => setShowFacilitatorDashboard(true)}
          title="Facilitator Dashboard (Research Data)"
        >
          <span className="text-stone-300 text-sm">{'\u{1F4CB}'}</span>
        </button>
        {/* Nash Dashboard Button */}
        {session.nashEngineOutput && (
          <button
            className="w-10 h-10 rounded-full bg-amber-700/80 border border-amber-600 flex items-center justify-center hover:bg-amber-600 transition-colors"
            onClick={() => useGameStore.setState((s) => ({ showNashDashboard: !s.showNashDashboard }))}
            title="Nash Equilibrium Dashboard"
          >
            <span className="text-amber-200 text-sm font-bold">NE</span>
          </button>
        )}
        {/* Game Graph Button */}
        <button
          className="w-10 h-10 rounded-full bg-stone-700/80 border border-stone-600 flex items-center justify-center hover:bg-stone-600 transition-colors"
          onClick={toggleGameGraph}
          title="Game Graph (V, E, VO)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
            <circle cx="4" cy="4" r="2" />
            <circle cx="14" cy="4" r="2" />
            <circle cx="9" cy="14" r="2" />
            <line x1="6" y1="4" x2="12" y2="4" />
            <line x1="4" y1="6" x2="9" y2="12" />
            <line x1="14" y1="6" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Player Panel */}
        <div className="p-3">
          <PlayerPanel
            players={players}
            currentPlayerId={currentPlayer?.id || null}
          />
        </div>

        {/* Center: Hex Board */}
        <div className="flex-1 relative">
          <HexGrid
            zones={zones}
            selectedZoneId={selectedZoneId}
            onZoneClick={handleZoneClick}
            playerStandees={playerStandees}
          />
        </div>

        {/* Right: Challenge Panel */}
        <div className="p-3 w-72 flex-shrink-0 overflow-y-auto">
          {activeChallenge ? (
            <ChallengeDisplay
              challenge={activeChallenge}
              seriesProgress={session.activeSeries || undefined}
              combinationProgress={session.activeCombination || undefined}
            />
          ) : (
            <div className="bg-stone-800/50 rounded-2xl p-6 text-center border border-stone-700/30">
              <p className="text-stone-500 text-sm">No active challenge</p>
              {currentPhase === 'event_roll' && (
                <p className="text-stone-600 text-xs mt-2">
                  Draw a challenge card to reveal this round&apos;s obstacle
                </p>
              )}
            </div>
          )}

          {/* Pending trades */}
          {session.tradeOffers.filter((t) => t.status === 'pending').length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Pending Trades
              </h4>
              {session.tradeOffers
                .filter((t) => t.status === 'pending')
                .map((trade) => (
                  <div
                    key={trade.id}
                    className="bg-stone-700/50 rounded-lg p-3 border border-stone-600/30"
                  >
                    <p className="text-stone-300 text-xs">
                      {session.players[trade.proposerId]?.name} offers to{' '}
                      {session.players[trade.targetId]?.name}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        className="flex-1 py-1 rounded text-xs font-bold bg-emerald-600 text-white
                                   hover:bg-emerald-500"
                        onClick={() => useGameStore.getState().acceptTrade(trade.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="flex-1 py-1 rounded text-xs font-bold bg-red-600 text-white
                                   hover:bg-red-500"
                        onClick={() => useGameStore.getState().rejectTrade(trade.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Gameplay Pipeline — Clarification → Deliberation → Action → Resolution */}
      {activeChallenge && (isDelibPhase || isActionPhase || currentPhase === 'round_end_accounting' || currentPhase === 'event_roll') && (
        <GameplayPipeline
          session={session}
          activeChallenge={activeChallenge}
          players={players}
          currentPhase={currentPhase}
          onAdvancePhase={advancePhase}
          onPlayCard={(cardId, zoneId) => playCard(cardId, zoneId)}
          onPassTurn={passTurn}
          onProposeTrade={proposeTrade}
          onEndDeliberation={endDeliberation}
          currentPlayer={currentPlayer}
          deliberationTimeRemaining={deliberationTimeRemaining}
        />
      )}

      {/* Staging Area */}
      <AnimatePresence>
        {showStagingArea && activeChallenge && (session.activeSeries || session.activeCombination) && (
          <div className="px-4 pb-2">
            <StagingArea
              series={session.activeSeries}
              combination={session.activeCombination}
              challenge={activeChallenge}
              onComplete={() => {
                setShowStagingArea(false);
                advancePhase();
              }}
              onCancel={() => setShowStagingArea(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Card Hand */}
      {currentPlayer && isActionPhase && (
        <div className="px-4">
          <CardHand
            cards={currentPlayer.hand}
            roleColor={ROLE_COLORS[currentPlayer.roleId] || '#666'}
            selectedCardId={selectedCardId}
            onCardSelect={selectCard}
            onCardPlay={handleCardPlay}
            isHidden={false}
            canPlay={true}
          />
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="bg-stone-900/95 border-t border-stone-700/50 px-4 py-3 flex items-center justify-between">
        <ActionBar
          onAdvancePhase={advancePhase}
          onRollDie={rollEventDie}
          onDrawChallenge={drawChallenge}
          onStartDeliberation={startDeliberation}
          onEndDeliberation={endDeliberation}
          onPass={passTurn}
          onTrade={() => useGameStore.setState({ showTradeModal: true })}
          onVote={() => useGameStore.setState({ showVoteModal: true })}
          onUseAbility={() => useUniqueAbility()}
          phase={currentPhase}
          canAct={!!currentPlayer}
          abilityUsesRemaining={currentPlayer?.uniqueAbilityUsesRemaining || 0}
          hasEventResult={!!session.eventRollResult}
        />

        <div className="flex items-center gap-6">
          <CWSBar
            current={session.cwsTracker.currentScore}
            target={session.cwsTracker.targetScore}
          />
          {isDelibPhase && <TimerDisplay seconds={deliberationTimeRemaining} />}
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showHandoff && currentPlayer && (
          <PlayerHandoff
            playerName={currentPlayer.name}
            roleId={currentPlayer.roleId}
            onDismiss={dismissHandoff}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTradeModal && currentPlayer && (
          <TradeModal
            players={players}
            currentPlayer={currentPlayer}
            onPropose={handleTradePropose}
            onClose={() => useGameStore.setState({ showTradeModal: false })}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVoteModal && (
          <VoteModal
            onVote={castVote}
            onClose={() => useGameStore.setState({ showVoteModal: false })}
          />
        )}
      </AnimatePresence>

      {/* Payment Day Overlay (Fix 5) */}
      <AnimatePresence>
        {showPaymentDay && currentPhase === 'payment_day' && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-stone-800 rounded-2xl p-8 max-w-2xl w-full border border-emerald-400/30 shadow-2xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <h2 className="text-2xl font-serif font-bold text-emerald-300 text-center mb-6">
                Payment Day — Round {session.currentRound}
              </h2>
              <p className="text-stone-400 text-xs text-center mb-4">Profession income distributed to all players</p>
              <div className="grid grid-cols-5 gap-3 mb-6">
                {players.map((p, i) => (
                  <motion.div
                    key={p.id}
                    className="text-center bg-stone-700/50 rounded-lg p-3"
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.15 }}
                  >
                    <div
                      className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg mb-2"
                      style={{ backgroundColor: ROLE_COLORS[p.roleId] }}
                    >
                      {ROLE_ICONS[p.roleId]}
                    </div>
                    <p className="text-stone-200 text-xs font-semibold">{p.name}</p>
                    <p className="text-[10px]" style={{ color: ROLE_COLORS[p.roleId] }}>{ROLE_NAMES[p.roleId]}</p>
                    <div className="mt-2 grid grid-cols-5 gap-0.5">
                      {(Object.entries(p.resources) as [ResourceType, number][]).map(([res, amt]) => (
                        <div key={res} className="text-center">
                          <div className="text-[8px]" style={{ color: RESOURCE_COLOR_MAP[res] }}>{RESOURCE_ICONS[res]}</div>
                          <span className="text-[9px] text-stone-300 font-bold">{amt}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
              <button
                className="w-full py-3 rounded-xl bg-emerald-500 text-stone-900 font-bold text-sm
                           hover:bg-emerald-400 transition-colors"
                onClick={() => {
                  dismissPaymentDay();
                  advancePhase();
                  // Start gamified event roll after payment day
                  setGamifiedPhase('event_roll');
                }}
              >
                Continue to Event Roll {'\u2192'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Overlay (Fix 5) */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <motion.h1
                className="text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: 2 }}
              >
                LEVEL UP!
              </motion.h1>
              <p className="text-stone-300 text-lg mt-4">
                The community&apos;s efforts are bearing fruit. New challenges and opportunities emerge.
              </p>
              <p className="text-amber-400 text-xl font-bold mt-2">
                Game Level {session.gameLevel}
              </p>
              <button
                className="mt-8 px-10 py-3 rounded-xl bg-amber-400 text-stone-900 font-bold
                           hover:bg-amber-300 transition-colors"
                onClick={dismissLevelUp}
              >
                Continue
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nash Dashboard */}
      <AnimatePresence>
        {useGameStore.getState().showNashDashboard && session.nashEngineOutput && (
          <NashDashboard
            nashOutput={session.nashEngineOutput}
            onClose={() => useGameStore.setState({ showNashDashboard: false })}
          />
        )}
      </AnimatePresence>

      {/* Facilitator Dashboard Overlay */}
      <AnimatePresence>
        {showFacilitatorDashboard && (
          <FacilitatorDashboard
            session={session}
            onClose={() => setShowFacilitatorDashboard(false)}
          />
        )}
      </AnimatePresence>

      {/* Zone Info Panel (Fix 2 — click to open) */}
      <AnimatePresence>
        {selectedZoneForPanel && session.board.zones[selectedZoneForPanel] && (
          <ZoneInfoPanel
            zone={session.board.zones[selectedZoneForPanel]}
            players={players.map(p => ({ id: p.id, name: p.name, roleId: p.roleId }))}
            adjacentZones={(session.board.adjacency[selectedZoneForPanel] || []).map(adjId => ({
              id: adjId,
              name: session.board.zones[adjId]?.name || adjId,
            }))}
            onClose={() => setSelectedZoneForPanel(null)}
            onNavigate={(zoneId) => { setSelectedZoneForPanel(zoneId); selectZone(zoneId); }}
          />
        )}
      </AnimatePresence>

      {/* Series Builder (Fix 4 — visible during deliberation and action phases) */}
      {(isDelibPhase || isActionPhase) && activeChallenge && (
        <div className="px-4 pb-2">
          <SeriesBuilder
            players={players}
            activeChallenge={activeChallenge}
            seriesCards={session.activeSeries?.cards || []}
            coalitionBonus={session.activeCoalitions.length > 0 ? 2 : 0}
            multiRoleBonus={session.activeSeries ? (new Set(session.activeSeries.cards.map(c => {
              const p = Object.values(session.players).find(pl => pl.id === c.playerId);
              return p?.roleId;
            }))).size >= 3 ? 3 : 0 : 0}
          />
        </div>
      )}

      {/* Büchi Warning Panel (Fix 4 Step 7) */}
      {isDelibPhase && (
        <div className="px-4 pb-2">
          <BuchiWarningPanel
            players={players}
            zones={session.board.zones}
            buchiHistory={session.buchiHistory || {}}
          />
        </div>
      )}

      {/* Game Graph View (Fix 6) */}
      <AnimatePresence>
        {showGameGraph && session.gameGraph && (
          <GameGraphView
            graph={session.gameGraph}
            currentRound={session.currentRound}
            onClose={toggleGameGraph}
          />
        )}
      </AnimatePresence>

      {/* Round-End Accounting / Scoring Summary */}
      <AnimatePresence>
        {(currentPhase === 'round_end_accounting' || currentPhase === 'level_check') && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-stone-800 rounded-2xl p-8 max-w-lg w-full border border-amber-400/30 shadow-2xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <h2 className="text-2xl font-serif font-bold text-amber-300 text-center mb-6">
                Round {session.currentRound} Scoring
              </h2>
              <div className="space-y-3 mb-6">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-stone-700/50 rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: ROLE_COLORS[p.roleId] }}
                      >
                        {ROLE_ICONS[p.roleId]}
                      </div>
                      <span className="text-stone-200 text-sm">{p.name}</span>
                    </div>
                    <span className="text-amber-300 font-bold">{p.utilityScore}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mb-4">
                <CWSBar
                  current={session.cwsTracker.currentScore}
                  target={session.cwsTracker.targetScore}
                />
              </div>
              <button
                className="w-full py-3 rounded-xl bg-amber-400 text-stone-900 font-bold text-sm
                           hover:bg-amber-300 transition-colors"
                onClick={advancePhase}
              >
                {session.currentRound >= session.totalRounds ? 'Final Results' : 'Next Round'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
