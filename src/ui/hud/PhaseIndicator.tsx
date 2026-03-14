import { motion, AnimatePresence } from 'framer-motion';
import type { GamePhase } from '../../core/models/types';

interface PhaseIndicatorProps {
  currentPhase: GamePhase;
  currentRound: number;
  totalRounds: number;
}

const PLAY_PHASES: { key: GamePhase; label: string }[] = [
  { key: 'phase_1_event', label: 'Event' },
  { key: 'phase_2_challenge', label: 'Challenge' },
  { key: 'phase_3_deliberation', label: 'Deliberation' },
  { key: 'phase_4_action', label: 'Action' },
  { key: 'phase_5_scoring', label: 'Scoring' },
];

const ROLE_COLORS: Record<string, string> = {
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
  // Default to a warm gold if no specific role context
  return '#D4A853';
}

export function PhaseIndicator({
  currentPhase,
  currentRound,
  totalRounds,
}: PhaseIndicatorProps) {
  const currentIndex = getPhaseIndex(currentPhase);
  const activeColor = getActiveRoleColor();

  return (
    <div className="flex items-center justify-between w-full bg-stone-900/90 backdrop-blur-sm border-b border-stone-700/50 px-4 py-2 rounded-b-lg shadow-lg">
      {/* Phase Steps */}
      <div className="flex items-center gap-1 flex-1">
        {PLAY_PHASES.map((phase, index) => {
          const isActive = index === currentIndex;
          const isCompleted = currentIndex > index;
          const isUpcoming = currentIndex < index;

          return (
            <div key={phase.key} className="flex items-center">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={`w-6 h-0.5 mx-0.5 transition-colors duration-500 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-stone-600'
                  }`}
                />
              )}

              {/* Phase pill */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${phase.key}-${isActive}`}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'text-white shadow-lg'
                      : isCompleted
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                      : 'bg-stone-800/50 text-stone-500 border border-stone-700/30'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: activeColor,
                          boxShadow: `0 0 16px ${activeColor}66`,
                        }
                      : undefined
                  }
                  initial={{ scale: 0.95, opacity: 0.7 }}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    opacity: isUpcoming ? 0.5 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  {/* Pulse ring for active phase */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ border: `2px solid ${activeColor}` }}
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.6, 0, 0.6],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}

                  {/* Checkmark for completed */}
                  {isCompleted && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="text-emerald-400 text-xs"
                    >
                      ✓
                    </motion.span>
                  )}

                  {/* Phase number for active */}
                  {isActive && (
                    <span className="w-4 h-4 flex items-center justify-center bg-white/20 rounded-full text-[10px] font-bold">
                      {index + 1}
                    </span>
                  )}

                  <span>{phase.label}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Round indicator */}
      <motion.div
        className="flex items-center gap-2 ml-4 pl-4 border-l border-stone-700/50"
        key={currentRound}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="text-stone-400 text-xs uppercase tracking-wider font-semibold">
          Round
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-bold text-amber-400">{currentRound}</span>
          <span className="text-stone-500 text-sm">/{totalRounds}</span>
        </div>
      </motion.div>
    </div>
  );
}

export { ROLE_COLORS };
