import { motion } from 'framer-motion';

interface PlayerHandoffProps {
  playerName: string;
  roleName: string;
  roleIcon: string;
  roleColor: string;
  roleSubtitle: string;
  onReady: () => void;
}

const ROLE_TIPS: Record<string, string> = {
  administrator:
    'You control funding and policy. Use your Authority to unlock critical resources for the team.',
  designer:
    'Your vision shapes the site. Use Design Thinking to create innovative solutions and rally votes.',
  citizen:
    'You are the voice of the community. Build trust and leverage volunteers to meet neighborhood needs.',
  investor:
    'Capital is your superpower. Fund strategic projects and negotiate deals that benefit everyone.',
  advocate:
    'Champion environmental and social justice. Your Political Leverage can shift the balance of power.',
};

export function PlayerHandoff({
  playerName,
  roleName,
  roleIcon,
  roleColor,
  roleSubtitle,
  onReady,
}: PlayerHandoffProps) {
  const tip = ROLE_TIPS[roleName.toLowerCase()] || 'Play to your strengths and collaborate!';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${roleColor}44 0%, ${roleColor}22 40%, #1C1917ee 100%)`,
        }}
      />

      {/* Decorative ring */}
      <motion.div
        className="absolute w-96 h-96 rounded-full border-2 opacity-20"
        style={{ borderColor: roleColor }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-md px-8"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
      >
        {/* Role icon */}
        <motion.div
          className="w-28 h-28 rounded-full flex items-center justify-center text-6xl mb-6 border-4 shadow-2xl"
          style={{
            borderColor: roleColor,
            backgroundColor: `${roleColor}22`,
            boxShadow: `0 0 40px ${roleColor}44`,
          }}
          initial={{ rotate: -10, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
        >
          {roleIcon}
        </motion.div>

        {/* Your Turn */}
        <motion.div
          className="text-stone-400 text-sm uppercase tracking-[0.3em] font-semibold mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Your Turn
        </motion.div>

        {/* Player name */}
        <motion.h1
          className="text-5xl font-bold text-white mb-2 tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {playerName}
        </motion.h1>

        {/* Role name */}
        <motion.div
          className="text-2xl font-semibold mb-1 capitalize"
          style={{ color: roleColor }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {roleName}
        </motion.div>

        {/* Role subtitle */}
        <motion.div
          className="text-stone-400 text-sm mb-6 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {roleSubtitle}
        </motion.div>

        {/* Tip */}
        <motion.div
          className="bg-stone-800/60 border border-stone-700/50 rounded-lg px-4 py-3 mb-8 max-w-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="text-stone-500 text-[10px] uppercase tracking-wider font-semibold mb-1">
            Tip
          </div>
          <p className="text-stone-300 text-xs leading-relaxed">{tip}</p>
        </motion.div>

        {/* Ready button */}
        <motion.button
          onClick={onReady}
          className="px-10 py-4 rounded-xl text-white text-lg font-bold uppercase tracking-wider shadow-2xl transition-all hover:brightness-110 active:scale-95"
          style={{
            backgroundColor: roleColor,
            boxShadow: `0 4px 24px ${roleColor}66`,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          I'm Ready
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
