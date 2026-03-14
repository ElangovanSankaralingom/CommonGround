import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface VotePopupProps {
  proposal: string;
  votes: Record<string, boolean>;
  requiredMajority: number;
  onVote: (vote: boolean) => void;
  currentPlayerId: string;
  hasVoted: boolean;
}

export function VotePopup({
  proposal,
  votes,
  requiredMajority,
  onVote,
  currentPlayerId,
  hasVoted,
}: VotePopupProps) {
  const voteEntries = Object.entries(votes);
  const yesCount = voteEntries.filter(([, v]) => v).length;
  const noCount = voteEntries.filter(([, v]) => !v).length;
  const totalVotes = voteEntries.length;

  const result = useMemo(() => {
    if (yesCount >= requiredMajority) return 'passed';
    if (noCount > 0 && totalVotes - noCount < requiredMajority) return 'failed';
    return 'pending';
  }, [yesCount, noCount, totalVotes, requiredMajority]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        className="relative z-10 bg-stone-900 border border-stone-700/50 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 bg-indigo-900/20">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🗳</span>
            <h2 className="text-white text-lg font-bold">Visionary Blueprint Vote</h2>
          </div>
          <p className="text-stone-400 text-xs">Designer's unique ability requires majority approval</p>
        </div>

        {/* Proposal */}
        <div className="px-6 py-4 border-b border-stone-800">
          <div className="text-stone-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
            Proposal
          </div>
          <p className="text-stone-200 text-sm leading-relaxed bg-stone-800/50 rounded-lg p-3 border border-stone-700/30">
            {proposal}
          </p>
        </div>

        {/* Majority threshold */}
        <div className="px-6 py-3 border-b border-stone-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-400 text-xs">Majority needed</span>
            <span className="text-stone-300 text-xs font-semibold">
              {yesCount}/{requiredMajority} votes
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: requiredMajority }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < yesCount ? 'bg-emerald-500' : 'bg-stone-700'
                }`}
                animate={i < yesCount ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </div>

        {/* Vote results */}
        <div className="px-6 py-3 border-b border-stone-800">
          <div className="text-stone-500 text-[10px] uppercase tracking-wider font-semibold mb-2">
            Votes Cast
          </div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {voteEntries.map(([playerId, vote]) => (
                <motion.div
                  key={playerId}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    vote
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                      : 'bg-red-900/40 text-red-300 border border-red-700/50'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-stone-700 flex items-center justify-center text-[10px] font-bold">
                    {playerId.charAt(0).toUpperCase()}
                  </span>
                  <span>{vote ? '✓' : '✗'}</span>
                </motion.div>
              ))}
            </AnimatePresence>

            {totalVotes === 0 && (
              <span className="text-stone-600 text-xs italic">No votes yet...</span>
            )}
          </div>
        </div>

        {/* Vote buttons or result */}
        <div className="px-6 py-4">
          <AnimatePresence mode="wait">
            {result === 'passed' && (
              <motion.div
                key="passed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-3"
              >
                <motion.div
                  className="text-4xl mb-2"
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  🎉
                </motion.div>
                <div className="text-emerald-400 text-lg font-bold">Proposal Passed!</div>
                <div className="text-stone-400 text-xs mt-1">The blueprint will be enacted</div>
              </motion.div>
            )}

            {result === 'failed' && (
              <motion.div
                key="failed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-3"
              >
                <div className="text-4xl mb-2 opacity-50">🚫</div>
                <div className="text-red-400 text-lg font-bold">Proposal Rejected</div>
                <div className="text-stone-400 text-xs mt-1">
                  Not enough support to proceed
                </div>
              </motion.div>
            )}

            {result === 'pending' && !hasVoted && (
              <motion.div
                key="voting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-4"
              >
                <motion.button
                  onClick={() => onVote(true)}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Vote Yes ✓
                </motion.button>
                <motion.button
                  onClick={() => onVote(false)}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-red-600 hover:bg-red-500 transition-colors shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Vote No ✗
                </motion.button>
              </motion.div>
            )}

            {result === 'pending' && hasVoted && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-3"
              >
                <motion.div
                  className="text-stone-400 text-sm"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Waiting for other players to vote...
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
