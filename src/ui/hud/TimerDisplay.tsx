import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface TimerDisplayProps {
  remainingSeconds: number;
  isRunning: boolean;
  totalSeconds: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TimerDisplay({
  remainingSeconds,
  isRunning,
  totalSeconds,
}: TimerDisplayProps) {
  const isUrgent = remainingSeconds <= 30 && remainingSeconds > 0;
  const isCritical = remainingSeconds <= 10 && remainingSeconds > 0;
  const isComplete = remainingSeconds <= 0 && isRunning;
  const progressPercent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;

  // Tick sound trigger for final 10 seconds
  const prevSecondsRef = useRef(remainingSeconds);
  useEffect(() => {
    if (
      isCritical &&
      isRunning &&
      remainingSeconds !== prevSecondsRef.current &&
      remainingSeconds > 0
    ) {
      // Dispatch a custom event that the audio system can listen to
      window.dispatchEvent(
        new CustomEvent('timer-tick', { detail: { seconds: remainingSeconds } })
      );
    }
    prevSecondsRef.current = remainingSeconds;
  }, [remainingSeconds, isCritical, isRunning]);

  // Fire time's up event
  useEffect(() => {
    if (isComplete) {
      window.dispatchEvent(new CustomEvent('timer-complete'));
    }
  }, [isComplete]);

  return (
    <div className="flex items-center gap-3 bg-stone-900/90 backdrop-blur-sm border border-stone-700/50 rounded-lg px-4 py-2 shadow-lg">
      {/* Timer icon */}
      <div className="text-stone-400">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>

      {/* Circular progress ring */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0">
          {/* Background ring */}
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#44403C"
            strokeWidth="3"
          />
          {/* Progress ring */}
          <motion.circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={isUrgent ? '#EF4444' : '#F4D03F'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 16}`}
            strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPercent / 100)}`}
            transform="rotate(-90 20 20)"
            animate={
              isUrgent
                ? {
                    stroke: ['#EF4444', '#DC2626', '#EF4444'],
                  }
                : {}
            }
            transition={
              isUrgent
                ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          />
        </svg>
      </div>

      {/* Time display */}
      <AnimatePresence mode="wait">
        {isComplete ? (
          <motion.div
            key="complete"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: 1,
            }}
            transition={{
              scale: { duration: 0.6, repeat: 2, ease: 'easeInOut' },
              opacity: { duration: 0.3 },
            }}
            className="text-xl font-bold text-red-400 tracking-wide"
          >
            TIME'S UP
          </motion.div>
        ) : (
          <motion.div
            key="timer"
            className={`text-2xl font-mono font-bold tabular-nums tracking-wider ${
              isCritical
                ? 'text-red-400'
                : isUrgent
                ? 'text-orange-400'
                : 'text-stone-200'
            }`}
            animate={
              isUrgent
                ? {
                    scale: [1, 1.05, 1],
                    opacity: [1, 0.7, 1],
                  }
                : {}
            }
            transition={
              isUrgent
                ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                : {}
            }
          >
            {formatTime(remainingSeconds)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status label */}
      {!isComplete && (
        <div
          className={`text-xs uppercase tracking-wider font-semibold ${
            isRunning ? 'text-stone-400' : 'text-stone-600'
          }`}
        >
          {isRunning ? 'Deliberation' : 'Paused'}
        </div>
      )}
    </div>
  );
}
