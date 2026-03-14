import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import { PhaseIndicator, ROLE_COLORS } from '../hud/PhaseIndicator';
import { HexGrid } from '../board';
import CardHand from '../cards/CardHand';
import ChallengeDisplay from '../cards/ChallengeDisplay';
import StagingArea from '../cards/StagingArea';
import type { RoleId, ResourcePool, ResourceType, Player } from '../../core/models/types';

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
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {phase === 'phase_1_event' && (
        <button
          className="px-4 py-2 rounded-lg bg-amber-500 text-stone-900 text-sm font-bold
                     hover:bg-amber-400 transition-colors shadow-md"
          onClick={onRollDie}
        >
          Roll Event Die
        </button>
      )}
      {phase === 'phase_2_challenge' && (
        <button
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold
                     hover:bg-red-400 transition-colors shadow-md"
          onClick={onDrawChallenge}
        >
          Draw Challenge
        </button>
      )}
      {phase === 'phase_3_deliberation' && (
        <>
          <button
            className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-bold
                       hover:bg-blue-400 transition-colors shadow-md"
            onClick={onTrade}
          >
            Propose Trade
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
      {phase === 'phase_4_action' && canAct && (
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
            Pass Turn
          </button>
        </>
      )}
      {(phase === 'phase_1_event' || phase === 'phase_2_challenge' || phase === 'phase_5_scoring') && (
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

function EventDieDisplay({ value, outcome }: { value: number; outcome: string }) {
  const color =
    outcome === 'positive_event'
      ? 'text-emerald-400'
      : outcome === 'negative_event'
      ? 'text-red-400'
      : 'text-stone-300';

  const label =
    outcome === 'positive_event'
      ? 'Positive Event!'
      : outcome === 'negative_event'
      ? 'Negative Event!'
      : 'No Event';

  return (
    <motion.div
      className="bg-stone-700/80 rounded-xl p-4 text-center"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', damping: 15 }}
    >
      <div
        className="w-16 h-16 mx-auto rounded-xl bg-stone-600 flex items-center justify-center
                   text-3xl font-black border-2 border-stone-500 shadow-inner"
      >
        {value}
      </div>
      <p className={`mt-2 text-sm font-bold ${color}`}>{label}</p>
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
    deliberationTimeRemaining,
    selectCard,
    selectZone,
    dismissHandoff,
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
    getCurrentPlayer,
    getActiveChallenge,
  } = useGameStore();

  const [showStagingArea, setShowStagingArea] = useState(false);

  if (!session) return null;

  const currentPlayer = getCurrentPlayer();
  const currentPhase = session.currentPhase;
  const players = Object.values(session.players);
  const zones = Object.values(session.board.zones);
  const activeChallenge = getActiveChallenge();
  const isActionPhase = currentPhase === 'phase_4_action';
  const isDelibPhase = currentPhase === 'phase_3_deliberation';

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
    },
    [selectZone, selectedZoneId]
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
      />

      {/* Event Die Result (Phase 1) */}
      <AnimatePresence>
        {currentPhase === 'phase_1_event' && session.eventDieResult && (
          <motion.div
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EventDieDisplay
              value={session.eventDieResult.value}
              outcome={session.eventDieResult.outcome}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
              {currentPhase === 'phase_2_challenge' && (
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

      {/* Phase 5: Scoring Summary Overlay */}
      <AnimatePresence>
        {currentPhase === 'phase_5_scoring' && (
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
