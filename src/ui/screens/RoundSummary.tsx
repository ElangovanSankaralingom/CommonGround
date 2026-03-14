import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store';
import type { RoleId, Player, Zone } from '../../core/models/types';

const ROLE_COLORS: Record<RoleId, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

const ROLE_ICONS: Record<RoleId, string> = {
  administrator: '\u{1F3DB}',
  designer: '\u{1F4D0}',
  citizen: '\u{1F91D}',
  investor: '\u{1F4B0}',
  advocate: '\u{1F33F}',
};

const CONDITION_COLORS: Record<string, string> = {
  good: '#27AE60',
  fair: '#F1C40F',
  poor: '#E67E22',
  critical: '#E74C3C',
  locked: '#95A5A6',
};

interface RoundSummaryProps {
  onNextRound: () => void;
  onFinalResults: () => void;
}

export default function RoundSummary({ onNextRound, onFinalResults }: RoundSummaryProps) {
  const { session } = useGameStore();

  if (!session) return null;

  const players = Object.values(session.players);
  const zones = Object.values(session.board.zones);
  const round = session.currentRound;
  const isLastRound = round >= session.totalRounds;

  // CWS change this round
  const cwsHistory = session.cwsTracker.history;
  const currentCWS = session.cwsTracker.currentScore;
  const prevCWS = cwsHistory.length >= 2 ? cwsHistory[cwsHistory.length - 2].score : 0;
  const cwsDelta = currentCWS - prevCWS;
  const cwsTarget = session.cwsTracker.targetScore;

  // Per-player deltas
  const playerData = useMemo(() => {
    return players.map((player) => {
      const prevUtility =
        player.utilityHistory.length >= 2
          ? player.utilityHistory[player.utilityHistory.length - 2]
          : 0;
      const utilityDelta = player.utilityScore - prevUtility;

      return {
        player,
        prevUtility,
        utilityDelta,
      };
    });
  }, [players]);

  // Challenges resolved/failed this round
  const roundChallenges = useMemo(() => {
    const resolved = session.roundLog.filter(
      (entry) => entry.round === round && entry.action === 'challenge_resolved'
    );
    const failed = session.roundLog.filter(
      (entry) => entry.round === round && entry.action === 'challenge_failed'
    );
    return { resolved: resolved.length, failed: failed.length };
  }, [session.roundLog, round]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-800 to-stone-900 text-stone-100 flex items-center justify-center p-6">
      <motion.div
        className="max-w-3xl w-full space-y-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Round header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-serif font-bold text-amber-300">
            Round {round} Summary
          </h1>
          <p className="text-stone-400 mt-1">
            {isLastRound ? 'Final round complete' : `${session.totalRounds - round} round${session.totalRounds - round > 1 ? 's' : ''} remaining`}
          </p>
        </motion.div>

        {/* CWS Change */}
        <motion.div
          className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
            Community Welfare Score
          </h3>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-3xl font-bold text-amber-300">{currentCWS}</span>
            <span className="text-stone-500 text-lg">/</span>
            <span className="text-stone-400 text-xl">{cwsTarget}</span>
            <motion.span
              className={`text-lg font-bold ml-2 ${
                cwsDelta > 0 ? 'text-emerald-400' : cwsDelta < 0 ? 'text-red-400' : 'text-stone-400'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              {cwsDelta > 0 ? '+' : ''}{cwsDelta}
            </motion.span>
          </div>
          <div className="w-full h-4 bg-stone-600 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor:
                  currentCWS >= cwsTarget ? '#10B981' : currentCWS >= cwsTarget * 0.6 ? '#F59E0B' : '#EF4444',
              }}
              initial={{ width: `${(prevCWS / cwsTarget) * 100}%` }}
              animate={{ width: `${Math.min(100, (currentCWS / cwsTarget) * 100)}%` }}
              transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
            />
            {/* Target marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white"
              style={{ left: '100%' }}
            />
          </div>
        </motion.div>

        {/* Per-player summary */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            Player Performance
          </h3>
          {playerData.map(({ player, utilityDelta }, i) => (
            <motion.div
              key={player.id}
              className="bg-stone-700/50 rounded-xl p-4 border border-stone-600/20 flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: ROLE_COLORS[player.roleId] }}
              >
                {ROLE_ICONS[player.roleId]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-stone-200 text-sm font-semibold">{player.name}</p>
                <p className="text-stone-500 text-xs">Level {player.level}</p>
              </div>
              <div className="text-right space-y-0.5">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-stone-400 text-xs">Utility</span>
                  <span className="text-stone-200 font-bold text-sm">{player.utilityScore}</span>
                  <span
                    className={`text-xs font-bold ${
                      utilityDelta > 0 ? 'text-emerald-400' : utilityDelta < 0 ? 'text-red-400' : 'text-stone-500'
                    }`}
                  >
                    ({utilityDelta > 0 ? '+' : ''}{utilityDelta})
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-stone-400 text-xs">CP</span>
                  <span className="text-amber-400 font-bold text-sm">{player.collaborationPoints}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Zone conditions */}
        <motion.div
          className="bg-stone-700/50 rounded-2xl p-6 border border-stone-600/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">
            Zone Conditions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {zones.map((zone) => {
              const prevCondition =
                zone.conditionHistory.length >= 2
                  ? zone.conditionHistory[zone.conditionHistory.length - 2]?.condition
                  : zone.condition;
              const changed = prevCondition !== zone.condition;

              return (
                <div
                  key={zone.id}
                  className={`rounded-lg p-3 border ${
                    changed ? 'border-amber-400/30' : 'border-stone-600/20'
                  } bg-stone-600/20`}
                >
                  <p className="text-stone-300 text-sm font-medium">{zone.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {changed && prevCondition && (
                      <>
                        <span
                          className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                          style={{
                            color: CONDITION_COLORS[prevCondition],
                            backgroundColor: `${CONDITION_COLORS[prevCondition]}22`,
                          }}
                        >
                          {prevCondition}
                        </span>
                        <span className="text-stone-500 text-xs">&rarr;</span>
                      </>
                    )}
                    <span
                      className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                      style={{
                        color: CONDITION_COLORS[zone.condition],
                        backgroundColor: `${CONDITION_COLORS[zone.condition]}22`,
                      }}
                    >
                      {zone.condition}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Challenges */}
        <motion.div
          className="flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex-1 bg-emerald-900/30 rounded-xl p-4 border border-emerald-700/30 text-center">
            <p className="text-emerald-400 text-3xl font-bold">{roundChallenges.resolved}</p>
            <p className="text-emerald-500/70 text-xs uppercase tracking-wider mt-1">
              Challenges Resolved
            </p>
          </div>
          <div className="flex-1 bg-red-900/30 rounded-xl p-4 border border-red-700/30 text-center">
            <p className="text-red-400 text-3xl font-bold">{roundChallenges.failed}</p>
            <p className="text-red-500/70 text-xs uppercase tracking-wider mt-1">
              Challenges Failed
            </p>
          </div>
        </motion.div>

        {/* Next button */}
        <motion.div
          className="text-center pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.button
            className="px-12 py-4 rounded-xl text-lg font-bold shadow-lg transition-all"
            style={{
              background: isLastRound
                ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                : 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: isLastRound
                ? '0 4px 20px rgba(245,158,11,0.3)'
                : '0 4px 20px rgba(16,185,129,0.3)',
              color: '#1C1917',
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={isLastRound ? onFinalResults : onNextRound}
          >
            {isLastRound ? 'View Final Results' : 'Begin Next Round'}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
