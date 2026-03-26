import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameSession } from '../../core/models/types';

interface RoundTransitionProps {
  session: GameSession;
  endCondition: 'none' | 'full_dne' | 'partial_success' | 'time_ends' | 'veto_deadlock';
  nashOutput: any;
  onNextRound: () => void;
  onDebrief: () => void;
}

const bannerConfig = {
  full_dne: {
    gradient: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600',
    text: 'text-stone-900',
    title: 'FULL SUCCESS — Shared Balance Point Achieved',
  },
  partial_success: {
    gradient: 'bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400',
    text: 'text-stone-800',
    title: 'PARTIAL SUCCESS — Progress made, but balance not reached',
  },
  time_ends: {
    gradient: 'bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800',
    text: 'text-amber-100',
    title: 'SESSION COMPLETE — The journey continues',
  },
  veto_deadlock: {
    gradient: 'bg-gradient-to-r from-red-800 via-red-700 to-red-800',
    text: 'text-red-100',
    title: 'DEADLOCK — Incompatible goals prevented resolution',
  },
} as const;

function ConfettiOverlay() {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 4 + Math.random() * 4,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        color: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7'][i % 5],
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: -10,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

function FailedConditions({ nashOutput }: { nashOutput: any }) {
  if (!nashOutput?.failedConditions?.length) return null;
  return (
    <ul className="mt-3 space-y-1 text-sm">
      {nashOutput.failedConditions.map((c: string, i: number) => (
        <li key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          {c}
        </li>
      ))}
    </ul>
  );
}

function EndGameBanner({
  session,
  endCondition,
  nashOutput,
  onNextRound,
  onDebrief,
}: Omit<RoundTransitionProps, 'endCondition'> & {
  endCondition: 'full_dne' | 'partial_success' | 'time_ends' | 'veto_deadlock';
}) {
  const cfg = bannerConfig[endCondition];
  const roundsRemain = session.currentRound < session.totalRounds;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative flex flex-col items-center justify-center min-h-[60vh] p-8"
    >
      {endCondition === 'full_dne' && <ConfettiOverlay />}

      <div className={`relative z-10 w-full max-w-2xl rounded-2xl p-8 shadow-2xl ${cfg.gradient}`}>
        <h1 className={`text-3xl font-bold text-center ${cfg.text}`}>{cfg.title}</h1>

        {endCondition === 'full_dne' && (
          <p className={`mt-4 text-center text-lg ${cfg.text} opacity-80`}>
            All zones flash green
          </p>
        )}

        {endCondition === 'partial_success' && (
          <div className={`mt-4 ${cfg.text}`}>
            <FailedConditions nashOutput={nashOutput} />
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-4">
          {endCondition === 'partial_success' && roundsRemain ? (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onNextRound}
                className="px-6 py-3 rounded-xl bg-stone-700 text-white font-semibold shadow-lg"
              >
                Continue to Next Season
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onDebrief}
                className="px-6 py-3 rounded-xl bg-stone-900 text-white font-semibold shadow-lg"
              >
                End Game
              </motion.button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDebrief}
              className={`px-8 py-4 rounded-xl text-lg font-bold shadow-lg ${
                endCondition === 'full_dne'
                  ? 'bg-stone-900 text-yellow-400'
                  : 'bg-white/20 text-white backdrop-blur'
              }`}
            >
              Proceed to Debrief &rarr;
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RoundTransitionScreen({
  session,
  onNextRound,
}: Pick<RoundTransitionProps, 'session' | 'onNextRound'>) {
  const { decks, currentRound, activeChallenge } = session;
  const nextRound = currentRound + 1;
  const hasUnresolved = activeChallenge && activeChallenge.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] p-8 space-y-8"
    >
      <h1 className="text-3xl font-bold text-stone-100">
        Season {currentRound} Complete.{' '}
        <span className="text-amber-400">Preparing Season {nextRound}...</span>
      </h1>

      <div className="w-full max-w-md space-y-3 bg-stone-800/60 rounded-xl p-6 border border-stone-700">
        <h2 className="text-lg font-semibold text-stone-300 mb-3">Deck Status</h2>
        <div className="flex justify-between text-stone-300">
          <span>Event Deck: {decks.eventDeck.length} remaining</span>
          <span className="text-stone-500">Discarded: {decks.eventDiscard.length}</span>
        </div>
        <div className="flex justify-between text-stone-300">
          <span>Challenge Deck: {decks.challengeDeck.length} remaining</span>
          <span className="text-stone-500">Discarded: {decks.challengeDiscard.length}</span>
        </div>
      </div>

      <AnimatePresence>
        {hasUnresolved && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-md bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-200 text-center"
          >
            Unresolved challenges persist — difficulty +2 next season
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNextRound}
        className="px-8 py-4 rounded-xl text-lg font-bold bg-amber-600 hover:bg-amber-500 text-stone-900 shadow-lg transition-colors"
      >
        Begin Season {nextRound} &rarr;
      </motion.button>
    </motion.div>
  );
}

export default function RoundTransition(props: RoundTransitionProps) {
  const { endCondition } = props;

  if (endCondition !== 'none') {
    return (
      <EndGameBanner
        {...props}
        endCondition={endCondition}
      />
    );
  }

  return <RoundTransitionScreen session={props.session} onNextRound={props.onNextRound} />;
}
