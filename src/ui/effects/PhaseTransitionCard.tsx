import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PHASE_NAMES = [
  'Event Roll',
  'Challenge',
  'Deliberation',
  'Action',
  'Scoring',
];

interface PhaseTransitionCardProps {
  fromPhase: number;
  toPhase: number;
  fromName: string;
  toName: string;
  onComplete: () => void;
}

export const PhaseTransitionCard: React.FC<PhaseTransitionCardProps> = ({
  fromPhase,
  toPhase,
  fromName,
  toName,
  onComplete,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Display for 1.5s, then trigger fade-out
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1800); // 300ms fade-in + 1500ms display

    return () => clearTimeout(timer);
  }, []);

  const handleExitComplete = () => {
    onComplete();
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Phase indicator bar */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
            {PHASE_NAMES.map((name, idx) => {
              const phaseNum = idx + 1;
              const isTransitioning = phaseNum === fromPhase || phaseNum === toPhase;
              const isCompleted = phaseNum < toPhase;

              return (
                <React.Fragment key={phaseNum}>
                  {idx > 0 && (
                    <div
                      className="w-6 h-0.5"
                      style={{
                        backgroundColor: isCompleted ? '#F59E0B' : 'rgba(255,255,255,0.2)',
                      }}
                    />
                  )}
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2"
                      style={{
                        backgroundColor: isTransitioning
                          ? 'rgba(245, 158, 11, 0.25)'
                          : isCompleted
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isTransitioning
                          ? '#F59E0B'
                          : isCompleted
                          ? 'rgba(245, 158, 11, 0.5)'
                          : 'rgba(255, 255, 255, 0.15)',
                        color: isTransitioning
                          ? '#F59E0B'
                          : isCompleted
                          ? 'rgba(245, 158, 11, 0.7)'
                          : 'rgba(255, 255, 255, 0.35)',
                      }}
                      animate={
                        isTransitioning
                          ? { scale: [1, 1.15, 1], borderColor: ['#F59E0B', '#FBBF24', '#F59E0B'] }
                          : {}
                      }
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      {phaseNum}
                    </motion.div>
                    <span
                      className="text-[10px] whitespace-nowrap"
                      style={{
                        color: isTransitioning
                          ? '#F59E0B'
                          : isCompleted
                          ? 'rgba(245, 158, 11, 0.6)'
                          : 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      {name}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Central transition text */}
          <div className="flex flex-col items-center gap-6">
            <motion.h1
              className="text-4xl font-bold tracking-wide"
              style={{ color: '#F59E0B' }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              Phase {fromPhase} Complete
            </motion.h1>

            <motion.div
              className="flex items-center gap-4 text-2xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
              <span className="text-white/50">{fromName}</span>
              <motion.span
                className="text-3xl"
                style={{ color: '#F59E0B' }}
                animate={{ x: [0, 6, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                &rarr;
              </motion.span>
              <span className="text-white font-semibold">
                Phase {toPhase}: {toName}
              </span>
            </motion.div>
          </div>

          {/* Subtle bottom hint */}
          <motion.p
            className="absolute bottom-8 text-xs text-white/25 tracking-wider uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Transitioning...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
