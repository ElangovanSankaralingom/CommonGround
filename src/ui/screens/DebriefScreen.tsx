import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import type { RoleId, EndGameResult } from '../../core/models/types';

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

const ROLE_NAMES: Record<RoleId, string> = {
  administrator: 'City Administrator',
  designer: 'Urban Designer',
  citizen: 'Community Organizer',
  investor: 'Private Investor',
  advocate: 'Environmental Advocate',
};

const RESULT_CONFIG = {
  full_success: {
    title: 'Full Success!',
    subtitle: 'The community thrives.',
    color: '#10B981',
    gradient: 'from-emerald-600 to-emerald-900',
    icon: '\u{1F3C6}',
  },
  partial_success: {
    title: 'Partial Success',
    subtitle: 'Progress was made, but challenges remain.',
    color: '#F59E0B',
    gradient: 'from-amber-600 to-amber-900',
    icon: '\u{1F31F}',
  },
  failure: {
    title: 'Failure',
    subtitle: 'The park project stalls. Lessons learned.',
    color: '#EF4444',
    gradient: 'from-red-600 to-red-900',
    icon: '\u{1F6A7}',
  },
};

interface DebriefScreenProps {
  onExportData: () => void;
  onNewGame: () => void;
  onDetailedStats: () => void;
}

export default function DebriefScreen({ onExportData, onNewGame, onDetailedStats }: DebriefScreenProps) {
  const { session } = useGameStore();
  const [revealStage, setRevealStage] = useState(0);

  // Animate reveal stages
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setRevealStage(1), 500));
    timers.push(setTimeout(() => setRevealStage(2), 1500));
    timers.push(setTimeout(() => setRevealStage(3), 2500));
    timers.push(setTimeout(() => setRevealStage(4), 3500));
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!session || !session.endResult) return null;

  const result = session.endResult;
  const config = RESULT_CONFIG[result.type];
  const players = Object.values(session.players);

  // Format Gini coefficient
  const giniPct = (result.giniCoefficient * 100).toFixed(1);
  const giniLabel =
    result.giniCoefficient < 0.2 ? 'Very Equal' :
    result.giniCoefficient < 0.35 ? 'Relatively Equal' :
    result.giniCoefficient < 0.5 ? 'Moderate Inequality' :
    'High Inequality';

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-stone-900 to-stone-950 text-stone-100 overflow-y-auto">
      {/* Dramatic Reveal */}
      <AnimatePresence>
        {revealStage >= 1 && (
          <motion.div
            className={`w-full py-16 bg-gradient-to-b ${config.gradient} relative overflow-hidden`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Decorative background */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, ${config.color}44 0%, transparent 50%),
                                  radial-gradient(circle at 80% 50%, ${config.color}22 0%, transparent 50%)`,
              }} />
            </div>

            <motion.div
              className="text-center relative z-10"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, delay: 0.3 }}
            >
              <motion.div
                className="text-7xl mb-4"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {config.icon}
              </motion.div>
              <h1 className="text-5xl md:text-6xl font-serif font-bold text-white mb-2">
                {config.title}
              </h1>
              <p className="text-white/70 text-lg">{config.subtitle}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Final CWS */}
        <AnimatePresence>
          {revealStage >= 2 && (
            <motion.div
              className="bg-stone-800/50 rounded-2xl p-8 border border-stone-700/30"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">
                Final Community Welfare Score
              </h2>
              <div className="flex items-center gap-6 mb-4">
                <motion.span
                  className="text-6xl font-bold"
                  style={{ color: config.color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.3 }}
                >
                  {result.finalCWS}
                </motion.span>
                <div>
                  <span className="text-stone-500 text-lg">/ {result.targetCWS}</span>
                  <p className="text-stone-500 text-sm">Target Score</p>
                </div>
              </div>
              <div className="w-full h-6 bg-stone-700 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: config.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (result.finalCWS / result.targetCWS) * 100)}%` }}
                  transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/70"
                  style={{ left: '100%' }}
                  title="Target"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Per-player results */}
        <AnimatePresence>
          {revealStage >= 3 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Player Results
              </h2>
              {result.playerResults.map((pr, i) => {
                const player = players.find((p) => p.id === pr.playerId);
                if (!player) return null;
                const roleColor = ROLE_COLORS[player.roleId];

                return (
                  <motion.div
                    key={pr.playerId}
                    className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                        style={{ backgroundColor: roleColor }}
                      >
                        {ROLE_ICONS[player.roleId]}
                      </div>
                      <div className="flex-1">
                        <p className="text-stone-200 font-bold">{player.name}</p>
                        <p className="text-xs" style={{ color: roleColor }}>
                          {ROLE_NAMES[player.roleId]} - Level {pr.level}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-300">{pr.finalUtility}</p>
                        <p className="text-stone-500 text-xs">Final Utility</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {/* Goals met */}
                      <div className="bg-stone-700/30 rounded-lg p-2 text-center">
                        <p className="text-xs text-stone-500 mb-1">Character Goal</p>
                        <div className="w-full h-2 bg-stone-600 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{ width: `${pr.characterGoalProgress * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-stone-300 mt-1">
                          {Math.round(pr.characterGoalProgress * 100)}%
                        </p>
                      </div>
                      <div className="bg-stone-700/30 rounded-lg p-2 text-center">
                        <p className="text-xs text-stone-500 mb-1">Survival</p>
                        <span
                          className={`text-sm font-bold ${
                            pr.survivalGoalMet ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {pr.survivalGoalMet ? 'MET' : 'FAILED'}
                        </span>
                      </div>
                      <div className="bg-stone-700/30 rounded-lg p-2 text-center">
                        <p className="text-xs text-stone-500 mb-1">Mission Goal</p>
                        <div className="w-full h-2 bg-stone-600 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-400"
                            style={{ width: `${pr.missionGoalProgress * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-stone-300 mt-1">
                          {Math.round(pr.missionGoalProgress * 100)}%
                        </p>
                      </div>
                      <div className="bg-stone-700/30 rounded-lg p-2 text-center">
                        <p className="text-xs text-stone-500 mb-1">Total CP</p>
                        <p className="text-lg font-bold text-amber-400">{pr.totalCP}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Theory Analysis */}
        <AnimatePresence>
          {revealStage >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Equity &amp; Game Theory Analysis
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Gini Coefficient */}
                <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20">
                  <h3 className="text-xs text-stone-500 uppercase tracking-wider mb-2">
                    Gini Coefficient
                  </h3>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-stone-200">{giniPct}%</span>
                  </div>
                  <p className="text-sm text-stone-400">{giniLabel}</p>
                  <div className="w-full h-2 bg-stone-700 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${result.giniCoefficient * 100}%`,
                        backgroundColor:
                          result.giniCoefficient < 0.2
                            ? '#10B981'
                            : result.giniCoefficient < 0.35
                            ? '#F59E0B'
                            : '#EF4444',
                      }}
                    />
                  </div>
                </div>

                {/* Nash Equilibrium */}
                <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20">
                  <h3 className="text-xs text-stone-500 uppercase tracking-wider mb-2">
                    Nash Equilibrium
                  </h3>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        result.nashEquilibriumApprox
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-600/40'
                          : 'bg-stone-700/40 text-stone-500 border border-stone-600/40'
                      }`}
                    >
                      {result.nashEquilibriumApprox ? '\u2713' : '\u2717'}
                    </div>
                    <div>
                      <p className="text-stone-200 font-semibold text-sm">
                        {result.nashEquilibriumApprox ? 'Approximated' : 'Not Reached'}
                      </p>
                      <p className="text-stone-500 text-xs">
                        {result.nashEquilibriumApprox
                          ? 'No player could improve alone'
                          : 'Unilateral improvement possible'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pareto Optimality */}
                <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20">
                  <h3 className="text-xs text-stone-500 uppercase tracking-wider mb-2">
                    Pareto Optimality
                  </h3>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        result.paretoOptimal
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-600/40'
                          : 'bg-stone-700/40 text-stone-500 border border-stone-600/40'
                      }`}
                    >
                      {result.paretoOptimal ? '\u2713' : '\u2717'}
                    </div>
                    <div>
                      <p className="text-stone-200 font-semibold text-sm">
                        {result.paretoOptimal ? 'Pareto Optimal' : 'Not Optimal'}
                      </p>
                      <p className="text-stone-500 text-xs">
                        {result.paretoOptimal
                          ? 'No one can improve without harming another'
                          : 'Better outcomes exist for all'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Statistics */}
              <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700/20">
                <h3 className="text-xs text-stone-500 uppercase tracking-wider mb-3">
                  Key Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-stone-500 text-xs">Rounds Played</p>
                    <p className="text-stone-200 text-xl font-bold">{session.totalRounds}</p>
                  </div>
                  <div>
                    <p className="text-stone-500 text-xs">Total Trades</p>
                    <p className="text-stone-200 text-xl font-bold">
                      {session.tradeOffers.filter((t) => t.status === 'completed').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500 text-xs">Utility Variance</p>
                    <p className="text-stone-200 text-xl font-bold">
                      {result.utilityVariance.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-stone-500 text-xs">Telemetry Events</p>
                    <p className="text-stone-200 text-xl font-bold">{session.telemetry.length}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center pt-4 pb-8">
                <motion.button
                  className="px-8 py-3 rounded-xl font-bold text-sm bg-amber-400 text-stone-900
                             hover:bg-amber-300 transition-colors shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onExportData}
                >
                  Export Data
                </motion.button>
                <motion.button
                  className="px-8 py-3 rounded-xl font-bold text-sm bg-stone-700 text-stone-200
                             hover:bg-stone-600 transition-colors border border-stone-600"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onNewGame}
                >
                  New Game
                </motion.button>
                <motion.button
                  className="px-8 py-3 rounded-xl font-bold text-sm bg-stone-700 text-stone-200
                             hover:bg-stone-600 transition-colors border border-stone-600"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onDetailedStats}
                >
                  View Detailed Stats
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
