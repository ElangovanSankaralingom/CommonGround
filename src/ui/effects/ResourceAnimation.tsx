import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Resource Icons ──────────────────────────────────────────
const RESOURCE_ICONS: Record<string, string> = {
  budget: '\uD83D\uDCB0',
  influence: '\uD83D\uDC51',
  volunteer: '\uD83D\uDC65',
  material: '\uD83E\uDDF1',
  knowledge: '\uD83D\uDCDA',
};

// ─── Resource Colors (mirrors constants.ts RESOURCE_COLORS) ──
const RESOURCE_COLORS: Record<string, string> = {
  budget: '#F4D03F',
  influence: '#3498DB',
  volunteer: '#27AE60',
  material: '#95A5A6',
  knowledge: '#8E44AD',
};

// ═══════════════════════════════════════════════════════════════
// ResourceAnimation
// ═══════════════════════════════════════════════════════════════

interface ResourceChange {
  resourceType: string;
  before: number;
  after: number;
  label: string;
  color: string;
}

interface ResourceAnimationProps {
  changes: ResourceChange[];
  onComplete: () => void;
}

export const ResourceAnimation: React.FC<ResourceAnimationProps> = ({
  changes,
  onComplete,
}) => {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss after all animations have played
  // Each row staggers by 0.2s, animation ~0.6s, plus 1.5s hold
  const totalDuration = changes.length * 200 + 600 + 1500;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, totalDuration);
    return () => clearTimeout(timer);
  }, [totalDuration]);

  const handleDismiss = () => {
    setVisible(false);
  };

  const handleExitComplete = () => {
    onComplete();
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleDismiss}
        >
          <motion.div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 min-w-[320px] max-w-[460px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Resource Changes
            </h3>

            <div className="flex flex-col gap-3">
              {changes.map((change, idx) => {
                const delta = change.after - change.before;
                const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
                const deltaColor = delta > 0 ? '#22C55E' : delta < 0 ? '#EF4444' : '#9CA3AF';
                const icon =
                  RESOURCE_ICONS[change.resourceType] || '\uD83D\uDD38';
                const accentColor =
                  change.color ||
                  RESOURCE_COLORS[change.resourceType] ||
                  '#9CA3AF';

                return (
                  <motion.div
                    key={`${change.resourceType}-${idx}`}
                    className="flex items-center gap-3 bg-gray-800/60 rounded-lg px-4 py-2"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.2, duration: 0.35 }}
                  >
                    {/* Animated token icon */}
                    <motion.span
                      className="text-2xl"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: [0.5, 1.4, 1] }}
                      transition={{
                        delay: idx * 0.2 + 0.15,
                        duration: 0.45,
                        times: [0, 0.6, 1],
                        ease: 'easeOut',
                      }}
                    >
                      {icon}
                    </motion.span>

                    {/* Label and values */}
                    <div className="flex-1 flex items-center gap-2 text-sm">
                      <span className="font-medium" style={{ color: accentColor }}>
                        {change.label}:
                      </span>
                      <span className="text-white/70 tabular-nums">{change.before}</span>
                      <span className="text-white/30">&rarr;</span>
                      <motion.span
                        className="font-bold tabular-nums"
                        style={{ color: accentColor }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.2 + 0.3 }}
                      >
                        {change.after}
                      </motion.span>
                    </div>

                    {/* Delta badge */}
                    <motion.span
                      className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
                      style={{
                        color: deltaColor,
                        backgroundColor:
                          delta > 0
                            ? 'rgba(34, 197, 94, 0.15)'
                            : delta < 0
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(156, 163, 175, 0.1)',
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{
                        delay: idx * 0.2 + 0.35,
                        duration: 0.3,
                        ease: 'easeOut',
                      }}
                    >
                      {deltaStr}
                    </motion.span>
                  </motion.div>
                );
              })}
            </div>

            {/* Dismiss hint */}
            <p className="text-[10px] text-white/20 text-center mt-4 uppercase tracking-wider">
              Click anywhere to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════
// DeckDisplay
// ═══════════════════════════════════════════════════════════════

interface DeckDisplayProps {
  label: string;
  remaining: number;
  discarded: number;
  cardBackColor: string;
}

export const DeckDisplay: React.FC<DeckDisplayProps> = ({
  label,
  remaining,
  discarded,
  cardBackColor,
}) => {
  return (
    <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-3 flex items-center gap-3 select-none">
      {/* Card stack visual — 3 offset rectangles */}
      <div className="relative w-10 h-14 flex-shrink-0">
        {/* Bottom card (most offset) */}
        <div
          className="absolute rounded-sm border border-white/10"
          style={{
            width: 32,
            height: 44,
            top: 4,
            left: 4,
            backgroundColor: cardBackColor,
            opacity: 0.4,
          }}
        />
        {/* Middle card */}
        <div
          className="absolute rounded-sm border border-white/10"
          style={{
            width: 32,
            height: 44,
            top: 2,
            left: 2,
            backgroundColor: cardBackColor,
            opacity: 0.65,
          }}
        />
        {/* Top card */}
        <div
          className="absolute rounded-sm border border-white/20 shadow-md"
          style={{
            width: 32,
            height: 44,
            top: 0,
            left: 0,
            backgroundColor: cardBackColor,
          }}
        >
          {/* Card face pattern */}
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-4 h-6 rounded-sm border"
              style={{ borderColor: 'rgba(255,255,255,0.25)' }}
            />
          </div>
        </div>

        {/* Count badge */}
        <div
          className="absolute -top-2 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
          style={{ backgroundColor: '#3B82F6' }}
        >
          {remaining}
        </div>
      </div>

      {/* Label and info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-semibold text-white/80 truncate">{label}</span>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span>{remaining} remaining</span>
          <span className="text-white/20">|</span>
          <span>{discarded} discarded</span>
        </div>
      </div>
    </div>
  );
};
