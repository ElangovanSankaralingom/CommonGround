import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store';
import type { GameConfig } from '../../core/models/types';

const HowToPlay = lazy(() => import('./HowToPlay'));

// ── Rotating taglines ──────────────────────────────────────────
const TAGLINES = [
  'Where every stakeholder has a voice',
  'No winners. No losers. Only better places.',
  'Reimagine public spaces together',
];

// ── Role data for icon strip ───────────────────────────────────
const ROLES: { icon: string; label: string; color: string }[] = [
  { icon: '🏛️', label: 'Administrator', color: '#C0392B' },
  { icon: '📐', label: 'Designer', color: '#2E86AB' },
  { icon: '🏘️', label: 'Citizen', color: '#27AE60' },
  { icon: '💼', label: 'Investor', color: '#E67E22' },
  { icon: '🌿', label: 'Advocate', color: '#8E44AD' },
];

// ── Floating leaf particles ────────────────────────────────────
const LEAVES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 8,
  duration: 10 + Math.random() * 8,
  size: 8 + Math.random() * 12,
  drift: (Math.random() - 0.5) * 60,
  opacity: 0.15 + Math.random() * 0.2,
  rotation: Math.random() * 360,
}));

// ── SVG background elements ───────────────────────────────────
function ParkScene() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B3A5C" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#2C5F7C" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#D4A574" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7BA05B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4A6B3A" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="1200" height="800" fill="url(#skyGrad)" />

      {/* Ground/grass area */}
      <ellipse cx="600" cy="750" rx="800" ry="200" fill="url(#groundGrad)" />

      {/* Pathway */}
      <motion.path
        d="M200,700 Q400,650 600,680 Q800,710 1000,660"
        stroke="#D4A574"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, delay: 0.5, ease: 'easeInOut' }}
      />

      {/* Trees - left cluster */}
      <motion.g
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.35, y: 0 }}
        transition={{ duration: 1.5, delay: 0.8 }}
      >
        {/* Tree 1 */}
        <rect x="140" y="520" width="8" height="80" fill="#6B4226" opacity="0.5" rx="2" />
        <circle cx="144" cy="500" r="35" fill="#7BA05B" opacity="0.4" />
        <circle cx="130" cy="510" r="25" fill="#5A8A3B" opacity="0.3" />
        {/* Tree 2 */}
        <rect x="80" y="540" width="7" height="70" fill="#6B4226" opacity="0.4" rx="2" />
        <circle cx="83" cy="520" r="30" fill="#6B9A4B" opacity="0.35" />
        {/* Tree 3 */}
        <rect x="210" y="530" width="6" height="60" fill="#6B4226" opacity="0.4" rx="2" />
        <circle cx="213" cy="515" r="28" fill="#7BA05B" opacity="0.3" />
      </motion.g>

      {/* Trees - right cluster */}
      <motion.g
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.35, y: 0 }}
        transition={{ duration: 1.5, delay: 1.0 }}
      >
        <rect x="950" y="510" width="8" height="85" fill="#6B4226" opacity="0.5" rx="2" />
        <circle cx="954" cy="490" r="38" fill="#7BA05B" opacity="0.4" />
        <circle cx="940" cy="505" r="26" fill="#5A8A3B" opacity="0.3" />
        <rect x="1040" y="530" width="7" height="65" fill="#6B4226" opacity="0.4" rx="2" />
        <circle cx="1043" cy="515" r="30" fill="#6B9A4B" opacity="0.3" />
      </motion.g>

      {/* Bench */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1.5, delay: 1.5 }}
      >
        <rect x="520" y="640" width="60" height="4" fill="#8B6F47" rx="2" />
        <rect x="525" y="644" width="4" height="16" fill="#8B6F47" rx="1" />
        <rect x="572" y="644" width="4" height="16" fill="#8B6F47" rx="1" />
        <rect x="520" y="630" width="60" height="3" fill="#8B6F47" rx="1" opacity="0.7" />
      </motion.g>

      {/* People silhouettes */}
      <motion.g
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 0.2, x: 0 }}
        transition={{ duration: 2, delay: 2 }}
      >
        {/* Person 1 - walking */}
        <circle cx="380" cy="650" r="6" fill="#1B3A5C" />
        <rect x="377" y="656" width="6" height="18" fill="#1B3A5C" rx="2" />
        {/* Person 2 */}
        <circle cx="420" cy="645" r="5" fill="#1B3A5C" />
        <rect x="417" y="650" width="6" height="16" fill="#1B3A5C" rx="2" />
        {/* Person 3 - sitting on bench */}
        <circle cx="540" cy="623" r="5" fill="#1B3A5C" />
        <rect x="537" y="628" width="6" height="12" fill="#1B3A5C" rx="2" />
      </motion.g>

      {/* Lamp post */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ duration: 1.5, delay: 1.2 }}
      >
        <rect x="700" y="550" width="4" height="100" fill="#6B6B6B" rx="1" />
        <ellipse cx="702" cy="545" rx="12" ry="6" fill="#F4D03F" opacity="0.4" />
        <circle cx="702" cy="545" r="4" fill="#F4D03F" opacity="0.6" />
      </motion.g>
    </svg>
  );
}

// ── About Research Modal ───────────────────────────────────────
function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative max-w-lg w-full rounded-2xl p-8 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #F5E6D3 0%, #E8D5BD 100%)',
          color: '#1B3A5C',
        }}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
          About This Research
        </h3>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: '#2C4A5C' }}>
          <p>
            <strong>CommonGround</strong> is a research tool developed to study <em>power dynamics
            in participatory placemaking</em> through applied gamification and non-zero-sum
            game theory.
          </p>
          <p>
            Players take on the roles of five real-world urban stakeholders — an Administrator,
            a Designer, a Citizen, an Investor, and an Advocate — each with different resources,
            goals, and constraints. The game models the tensions and trade-offs inherent in
            transforming public spaces.
          </p>
          <p>
            Every decision, trade, and collaboration is recorded for research analysis. The
            Collective Welfare Score measures how well the group balances individual interests
            with collective benefit — reflecting real-world placemaking outcomes.
          </p>
          <p className="text-xs opacity-70 pt-2 border-t border-[#1B3A5C]/10">
            Built with non-zero-sum game theory, welfare economics, and tabletop RPG mechanics.
            All game data is exportable for academic analysis.
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: '#1B3A5C', color: '#F5E6D3' }}
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main TitleScreen ───────────────────────────────────────────
export default function TitleScreen() {
  const initializeGame = useGameStore((s) => s.initializeGame);
  const loadGame = useGameStore((s) => s.loadGame);

  const [taglineIndex, setTaglineIndex] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate taglines every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleNewGame = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      const config: GameConfig = {
        totalRounds: 4,
        deliberationTimerSeconds: 300,
        facilitatorMode: 'ai',
        cwsTarget: 80,
        equityBandK: 0.15,
        difficultyEscalation: 2,
        enableTutorial: false,
        siteId: 'corporation-eco-park',
      };
      initializeGame(config, []);
    }, 600);
  }, [initializeGame]);

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result;
        if (typeof text === 'string') {
          loadGame(text);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadGame]
  );

  return (
    <motion.div
      className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ── Background layers ─────────────────────────────── */}

      {/* Base warm gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(199, 91, 57, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(123, 160, 91, 0.12) 0%, transparent 50%),
            linear-gradient(175deg, #1B3A5C 0%, #2C5F7C 30%, #D4A574 70%, #C75B39 100%)
          `,
        }}
      />

      {/* Paper/linen texture noise */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Park scene SVG illustration */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <ParkScene />
      </motion.div>

      {/* Soft overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center 40%, rgba(27, 58, 92, 0.5) 0%, rgba(27, 58, 92, 0.2) 40%, transparent 70%),
            linear-gradient(to bottom, rgba(27, 58, 92, 0.3) 0%, transparent 30%, transparent 70%, rgba(27, 58, 92, 0.4) 100%)
          `,
        }}
      />

      {/* ── Floating leaf particles ───────────────────────── */}
      {LEAVES.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${leaf.x}%`,
            fontSize: leaf.size,
            color: leaf.id % 3 === 0 ? '#7BA05B' : leaf.id % 3 === 1 ? '#D4A574' : '#C75B39',
          }}
          initial={{ y: '105vh', x: 0, rotate: leaf.rotation, opacity: 0 }}
          animate={{
            y: '-10vh',
            x: [0, leaf.drift, leaf.drift * 0.5, leaf.drift * 1.2],
            rotate: leaf.rotation + 360,
            opacity: [0, leaf.opacity, leaf.opacity, 0],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {leaf.id % 4 === 0 ? '🍃' : leaf.id % 4 === 1 ? '🍂' : leaf.id % 4 === 2 ? '✦' : '·'}
        </motion.div>
      ))}

      {/* ── Main content ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-2xl">

        {/* Title */}
        <motion.h1
          className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-[0.12em] text-center"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            color: '#F5E6D3',
            textShadow: '0 0 40px rgba(244, 208, 63, 0.3), 0 4px 12px rgba(0,0,0,0.4)',
          }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
        >
          COMMONGROUND
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-lg sm:text-xl tracking-[0.2em] uppercase text-center"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            color: '#D4A574',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          A Collaborative Placemaking Game
        </motion.p>

        {/* Rotating tagline */}
        <motion.div
          className="h-8 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={taglineIndex}
              className="text-sm sm:text-base italic text-center"
              style={{ color: 'rgba(245, 230, 211, 0.7)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              "{TAGLINES[taglineIndex]}"
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Decorative divider */}
        <motion.div
          className="flex items-center gap-3 my-2"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 165, 116, 0.5))' }} />
          <div className="w-2 h-2 rotate-45" style={{ background: 'rgba(244, 208, 63, 0.5)' }} />
          <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 165, 116, 0.5))' }} />
        </motion.div>

        {/* Role icons strip */}
        <motion.div
          className="flex items-center gap-6 sm:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
        >
          {ROLES.map((role, i) => (
            <motion.div
              key={role.label}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.15, duration: 0.5 }}
            >
              <motion.span
                className="text-2xl sm:text-3xl"
                animate={{ y: [0, -3, 0] }}
                transition={{
                  duration: 2.5 + i * 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.4,
                }}
              >
                {role.icon}
              </motion.span>
              <motion.span
                className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium"
                style={{ color: role.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 1.3 + i * 0.15, duration: 0.5 }}
              >
                {role.label}
              </motion.span>
            </motion.div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="flex flex-col items-center gap-3 mt-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.5, ease: 'easeOut' }}
        >
          {/* New Game button */}
          <motion.button
            className="w-56 sm:w-64 py-3.5 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-colors"
            style={{
              background: 'linear-gradient(135deg, #C75B39 0%, #D4A574 50%, #F4D03F 100%)',
              color: '#1B3A5C',
              boxShadow: '0 4px 20px rgba(199, 91, 57, 0.4)',
            }}
            whileHover={{
              scale: 1.04,
              boxShadow: '0 6px 30px rgba(199, 91, 57, 0.6), 0 0 20px rgba(244, 208, 63, 0.3)',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={handleNewGame}
          >
            New Game
          </motion.button>

          {/* Load Game button */}
          <motion.button
            className="w-56 sm:w-64 py-3 rounded-xl text-base font-semibold tracking-wide
                       border-2 transition-all"
            style={{
              borderColor: 'rgba(212, 165, 116, 0.5)',
              color: '#D4A574',
              background: 'rgba(27, 58, 92, 0.3)',
              backdropFilter: 'blur(4px)',
            }}
            whileHover={{
              scale: 1.03,
              borderColor: 'rgba(212, 165, 116, 0.8)',
              background: 'rgba(27, 58, 92, 0.5)',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={handleLoadClick}
          >
            Load Game
          </motion.button>

          {/* How to Play button */}
          <motion.button
            className="w-56 sm:w-64 py-2.5 rounded-xl text-sm font-semibold tracking-wide
                       transition-all"
            style={{
              color: 'rgba(212, 165, 116, 0.8)',
              background: 'transparent',
              border: '1px solid rgba(212, 165, 116, 0.25)',
            }}
            whileHover={{
              scale: 1.03,
              borderColor: 'rgba(212, 165, 116, 0.5)',
              background: 'rgba(27, 58, 92, 0.3)',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowHowToPlay(true)}
          >
            How to Play
          </motion.button>
        </motion.div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".commonground,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Footer ────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-6 flex flex-col items-center gap-2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <button
          onClick={() => setShowAbout(true)}
          className="text-xs tracking-wider uppercase transition-all hover:opacity-100"
          style={{ color: 'rgba(212, 165, 116, 0.6)' }}
        >
          About This Research
        </button>
        <p
          className="text-[10px] tracking-wide text-center max-w-md px-4"
          style={{ color: 'rgba(245, 230, 211, 0.35)' }}
        >
          A research project exploring participatory placemaking through tabletop RPG mechanics
        </p>
      </motion.div>

      {/* About modal */}
      <AnimatePresence>
        {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      </AnimatePresence>

      {/* How to Play overlay */}
      {showHowToPlay && (
        <Suspense fallback={
          <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: '#F5E6D3' }}>
            <div className="animate-pulse text-lg" style={{ color: '#8B6F47' }}>Loading...</div>
          </div>
        }>
          <HowToPlay onClose={() => setShowHowToPlay(false)} />
        </Suspense>
      )}
    </motion.div>
  );
}
