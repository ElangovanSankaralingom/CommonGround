import { motion, AnimatePresence } from 'framer-motion';
import type { GamePhase } from '../../core/models/types';

interface PhaseIndicatorProps {
  currentPhase: GamePhase;
  currentRound: number;
  totalRounds: number;
  gameLevel?: number;
}

// Map the spec's 5 phases to the internal engine phases
const DISPLAY_PHASES: { label: string; number: string; enginePhases: GamePhase[]; guidance: string }[] = [
  {
    label: 'Event Roll',
    number: '1',
    enginePhases: ['payment_day', 'event_roll'],
    guidance: 'The facilitator rolls a d6 to determine if an external event affects the game.',
  },
  {
    label: 'Challenge',
    number: '2',
    enginePhases: [],  // Challenge is drawn during event_roll in our engine
    guidance: 'A challenge card is drawn. Study the problem and ask clarifying questions.',
  },
  {
    label: 'Deliberation',
    number: '3',
    enginePhases: ['deliberation'],
    guidance: 'Negotiate, trade resources, form coalitions, and plan your card series.',
  },
  {
    label: 'Action',
    number: '4',
    enginePhases: ['individual_action', 'action_resolution'],
    guidance: 'Players take turns playing cards. Lowest utility player acts first.',
  },
  {
    label: 'Scoring',
    number: '5',
    enginePhases: ['round_end_accounting', 'level_check', 'round_end'],
    guidance: 'Zone conditions update, utilities recalculate, CWS updates, Nash check runs.',
  },
];

export const ROLE_COLORS: Record<string, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

function getActivePhaseIndex(phase: GamePhase): number {
  for (let i = 0; i < DISPLAY_PHASES.length; i++) {
    if (DISPLAY_PHASES[i].enginePhases.includes(phase)) return i;
  }
  // Payment day and event_roll both map to Phase 1
  if (phase === 'payment_day' || phase === 'event_roll') return 0;
  return -1;
}

export function getPhaseGuidance(phase: GamePhase): string {
  const idx = getActivePhaseIndex(phase);
  if (idx >= 0) return DISPLAY_PHASES[idx].guidance;
  if (phase === 'payment_day') return 'Each player receives their round income based on their role.';
  return '';
}

export function PhaseIndicator({ currentPhase, currentRound, totalRounds, gameLevel = 1 }: PhaseIndicatorProps) {
  const currentIndex = getActivePhaseIndex(currentPhase);
  const guidance = getPhaseGuidance(currentPhase);

  return (
    <div className="w-full bg-stone-900/90 backdrop-blur-sm border-b border-stone-700/50 px-4 py-2 rounded-b-lg shadow-lg">
      <div className="flex items-center justify-between">
        {/* Phase Steps — 5 phases per spec */}
        <div className="flex items-center gap-1 flex-1">
          {DISPLAY_PHASES.map((phase, index) => {
            const isActive = index === currentIndex;
            const isCompleted = currentIndex > index;
            const isUpcoming = currentIndex < index;

            return (
              <div key={phase.label} className="flex items-center">
                {index > 0 && (
                  <div className={`w-6 h-0.5 mx-0.5 transition-colors duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-stone-600'}`} />
                )}
                <motion.div
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-500 text-stone-900 shadow-lg shadow-amber-400/30'
                      : isCompleted
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                      : 'bg-stone-800/50 text-stone-500 border border-stone-700/30'
                  }`}
                  animate={{ scale: isActive ? 1.05 : 1, opacity: isUpcoming ? 0.5 : 1 }}
                >
                  {isCompleted && <span className="text-emerald-400 text-[10px]">{'\u2713'}</span>}
                  {isActive && (
                    <span className="w-4 h-4 flex items-center justify-center bg-white/20 rounded-full text-[10px] font-bold">
                      {phase.number}
                    </span>
                  )}
                  <span className="whitespace-nowrap">{phase.label}</span>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Game Level + Round */}
        <div className="flex items-center gap-3 ml-3">
          {gameLevel > 1 && (
            <div className="px-2 py-1 rounded-full bg-indigo-900/40 border border-indigo-700/50">
              <span className="text-indigo-300 text-xs font-bold">Lv {gameLevel}</span>
            </div>
          )}
          <motion.div
            className="flex items-center gap-1.5 pl-3 border-l border-stone-700/50"
            key={currentRound}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <span className="text-stone-400 text-xs uppercase tracking-wider font-semibold">Round</span>
            <span className="text-lg font-bold text-amber-400">{currentRound}</span>
            <span className="text-stone-500 text-sm">/{totalRounds}</span>
          </motion.div>
        </div>
      </div>

      {/* Guidance text */}
      {guidance && (
        <motion.p
          className="text-stone-400 text-xs mt-1.5 pl-1"
          key={currentPhase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Phase {currentIndex >= 0 ? currentIndex + 1 : '?'} of 5: {guidance}
        </motion.p>
      )}
    </div>
  );
}
