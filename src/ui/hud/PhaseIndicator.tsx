import { motion, AnimatePresence } from 'framer-motion';
import type { GamePhase } from '../../core/models/types';

interface PhaseIndicatorProps {
  currentPhase: GamePhase;
  currentRound: number;
  totalRounds: number;
  gameLevel?: number;
}

const PLAY_PHASES: { key: GamePhase; label: string; icon: string }[] = [
  { key: 'payment_day', label: 'Payment Day', icon: '1' },
  { key: 'event_roll', label: 'Event Roll', icon: '2' },
  { key: 'individual_action', label: 'Individual', icon: '3' },
  { key: 'deliberation', label: 'Deliberation', icon: '4' },
  { key: 'action_resolution', label: 'Resolution', icon: '5' },
  { key: 'round_end_accounting', label: 'Accounting', icon: '6' },
  { key: 'level_check', label: 'Level Check', icon: '7' },
];

export const ROLE_COLORS: Record<string, string> = {
  administrator: '#C0392B',
  designer: '#2E86AB',
  citizen: '#27AE60',
  investor: '#E67E22',
  advocate: '#8E44AD',
};

function getPhaseIndex(phase: GamePhase): number {
  return PLAY_PHASES.findIndex((p) => p.key === phase);
}

function getActiveRoleColor(): string {
  return '#D4A853';
}

export function PhaseIndicator({
  currentPhase,
  currentRound,
  totalRounds,
  gameLevel = 1,
}: PhaseIndicatorProps) {
  const currentIndex = getPhaseIndex(currentPhase);
  const activeColor = getActiveRoleColor();

  return (
    <div className="flex items-center justify-between w-full bg-stone-900/90 backdrop-blur-sm border-b border-stone-700/50 px-4 py-2 rounded-b-lg shadow-lg">
      {/* Phase Steps */}
      <div className="flex items-center gap-0.5 flex-1">
        {PLAY_PHASES.map((phase, index) => {
          const isActive = index === currentIndex;
          const isCompleted = currentIndex > index;
          const isUpcoming = currentIndex < index;

          return (
            <div key={phase.key} className="flex items-center">
              {index > 0 && (
                <div
                  className={`w-4 h-0.5 mx-0.5 transition-colors duration-500 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-stone-600'
                  }`}
                />
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${phase.key}-${isActive}`}
                  className={`relative flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'text-white shadow-lg'
                      : isCompleted
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                      : 'bg-stone-800/50 text-stone-500 border border-stone-700/30'
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: activeColor, boxShadow: `0 0 16px ${activeColor}66` }
                      : undefined
                  }
                  initial={{ scale: 0.95, opacity: 0.7 }}
                  animate={{ scale: isActive ? 1.05 : 1, opacity: isUpcoming ? 0.5 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ border: `2px solid ${activeColor}` }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {isCompleted && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="text-emerald-400 text-[10px]"
                    >
                      ✓
                    </motion.span>
                  )}

                  {isActive && (
                    <span className="w-3.5 h-3.5 flex items-center justify-center bg-white/20 rounded-full text-[9px] font-bold">
                      {phase.icon}
                    </span>
                  )}

                  <span className="whitespace-nowrap">{phase.label}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Game Level indicator */}
      <motion.div
        className="flex items-center gap-1 mx-3 px-2 py-1 rounded-full bg-indigo-900/40 border border-indigo-700/50"
        key={gameLevel}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
      >
        <span className="text-indigo-400 text-[10px] uppercase tracking-wider font-semibold">Lv</span>
        <span className="text-indigo-300 text-xs font-bold">{gameLevel}</span>
      </motion.div>

      {/* Round indicator */}
      <motion.div
        className="flex items-center gap-2 pl-3 border-l border-stone-700/50"
        key={currentRound}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">Round</div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-amber-400">{currentRound}</span>
          <span className="text-stone-500 text-sm">/{totalRounds}</span>
        </div>
      </motion.div>
    </div>
  );
}
