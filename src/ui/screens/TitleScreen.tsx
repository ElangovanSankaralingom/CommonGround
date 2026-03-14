import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TitleScreenProps {
  onNewGame: () => void;
  onLoadGame: (data: string) => void;
  onHowToPlay: () => void;
}

const FLOATING_TOKENS = [
  { icon: '\u2666', delay: 0, x: '15%', size: 28, duration: 6 },
  { icon: '\u2663', delay: 1.2, x: '78%', size: 22, duration: 7 },
  { icon: '\u2660', delay: 2.5, x: '35%', size: 20, duration: 8 },
  { icon: '\u2665', delay: 0.8, x: '62%', size: 26, duration: 5.5 },
  { icon: '\u25C6', delay: 3.1, x: '88%', size: 18, duration: 7.5 },
  { icon: '\u25CB', delay: 1.8, x: '8%', size: 24, duration: 6.5 },
  { icon: '\u25A0', delay: 0.4, x: '50%', size: 16, duration: 9 },
  { icon: '\u2B22', delay: 2.0, x: '25%', size: 20, duration: 7 },
];

export default function TitleScreen({ onNewGame, onLoadGame, onHowToPlay }: TitleScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          onLoadGame(text);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [onLoadGame]
  );

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center">
      {/* Wood-tone background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(160deg, #6B4226 0%, #8B6914 25%, #A0762C 50%, #8B5E14 75%, #5C3D1E 100%)
          `,
        }}
      />
      {/* Wood grain overlay */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              92deg,
              transparent,
              transparent 18px,
              rgba(0,0,0,0.06) 18px,
              rgba(0,0,0,0.06) 19px
            ),
            repeating-linear-gradient(
              88deg,
              transparent,
              transparent 30px,
              rgba(255,255,255,0.03) 30px,
              rgba(255,255,255,0.03) 31px
            )
          `,
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Floating tokens */}
      {FLOATING_TOKENS.map((token, i) => (
        <motion.div
          key={i}
          className="absolute text-amber-300/20 select-none pointer-events-none"
          style={{ left: token.x, fontSize: token.size }}
          initial={{ y: '110vh', opacity: 0, rotate: 0 }}
          animate={{
            y: ['-10vh'],
            opacity: [0, 0.3, 0.3, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: token.duration,
            delay: token.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {token.icon}
        </motion.div>
      ))}

      {/* Board game frame decoration - top */}
      <motion.div
        className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-amber-400/50" />
        <div className="w-3 h-3 rotate-45 border border-amber-400/50" />
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-amber-400/50" />
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <motion.h1
            className="text-7xl md:text-8xl font-serif font-bold tracking-wider text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(180deg, #F5DEB3 0%, #D4A853 40%, #B8860B 100%)',
              textShadow: '0 4px 16px rgba(0,0,0,0.3)',
              fontFamily: '"Playfair Display", "Georgia", serif',
            }}
            initial={{ letterSpacing: '0.3em' }}
            animate={{ letterSpacing: '0.15em' }}
            transition={{ delay: 0.3, duration: 1.5, ease: 'easeOut' }}
          >
            COMMONGROUND
          </motion.h1>

          <motion.div
            className="mt-3 flex items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400/60" />
            <p
              className="text-lg md:text-xl tracking-widest uppercase"
              style={{
                color: '#D4A853',
                fontFamily: '"Playfair Display", "Georgia", serif',
              }}
            >
              A Cooperative Placemaking Game
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400/60" />
          </motion.div>
        </motion.div>

        {/* Decorative hex cluster */}
        <motion.div
          className="flex items-center gap-2 opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.svg
              key={i}
              width="24"
              height="28"
              viewBox="0 0 24 28"
              fill="none"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.1 }}
            >
              <path
                d="M12 1L23 7.5V20.5L12 27L1 20.5V7.5L12 1Z"
                stroke="#D4A853"
                strokeWidth="1.5"
                fill="none"
              />
            </motion.svg>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="flex flex-col items-center gap-4 mt-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8 }}
        >
          <motion.button
            className="w-64 py-4 rounded-xl text-lg font-bold tracking-wide text-stone-900
                       shadow-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #F5DEB3, #D4A853)',
              boxShadow: '0 4px 20px rgba(212, 168, 83, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
            whileHover={{
              scale: 1.03,
              boxShadow: '0 6px 28px rgba(212, 168, 83, 0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onNewGame}
          >
            New Game
          </motion.button>

          <motion.button
            className="w-64 py-3 rounded-xl text-base font-semibold tracking-wide
                       border-2 border-amber-400/50 text-amber-200 bg-stone-900/40
                       backdrop-blur-sm hover:bg-stone-900/60 hover:border-amber-400/70
                       transition-all shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLoadClick}
          >
            Load Game
          </motion.button>

          <motion.button
            className="w-64 py-3 rounded-xl text-base font-semibold tracking-wide
                       border border-stone-500/50 text-stone-300 bg-stone-800/30
                       backdrop-blur-sm hover:bg-stone-800/50 hover:text-stone-200
                       transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onHowToPlay}
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

      {/* Version info */}
      <motion.div
        className="absolute bottom-6 text-center text-stone-500/60 text-xs tracking-wider"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <p>CommonGround v0.1.0</p>
        <p className="mt-0.5">A TCE Research Project</p>
      </motion.div>

      {/* Board game frame decoration - bottom */}
      <motion.div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <div className="h-px w-24 bg-gradient-to-r from-transparent to-amber-400/30" />
        <div className="w-2 h-2 rotate-45 bg-amber-400/30" />
        <div className="h-px w-24 bg-gradient-to-l from-transparent to-amber-400/30" />
      </motion.div>
    </div>
  );
}
