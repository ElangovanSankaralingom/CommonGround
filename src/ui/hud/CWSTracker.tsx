import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface CWSTrackerProps {
  currentScore: number;
  targetScore: number;
  history: { round: number; score: number }[];
}

function Sparkline({
  data,
  width = 80,
  height = 24,
}: {
  data: { round: number; score: number }[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const scores = data.map((d) => d.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.score - minScore) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block ml-2"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#F4D03F"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last point */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) / (data.length - 1) * width}
          cy={height - ((scores[scores.length - 1] - minScore) / range) * height}
          r="2.5"
          fill="#F4D03F"
        />
      )}
    </svg>
  );
}

export function CWSTracker({ currentScore, targetScore, history }: CWSTrackerProps) {
  const percentage = Math.min((currentScore / targetScore) * 100, 100);
  const prevScoreRef = useRef(currentScore);
  const [changeDirection, setChangeDirection] = useState<'up' | 'down' | null>(null);

  const springValue = useSpring(0, { stiffness: 80, damping: 20 });
  const displayWidth = useTransform(springValue, (v) => `${v}%`);

  useEffect(() => {
    springValue.set(percentage);
  }, [percentage, springValue]);

  useEffect(() => {
    if (currentScore > prevScoreRef.current) {
      setChangeDirection('up');
    } else if (currentScore < prevScoreRef.current) {
      setChangeDirection('down');
    } else {
      setChangeDirection(null);
    }
    prevScoreRef.current = currentScore;

    const timeout = setTimeout(() => setChangeDirection(null), 1500);
    return () => clearTimeout(timeout);
  }, [currentScore]);

  return (
    <motion.div
      className="flex items-center gap-3 bg-stone-900/90 backdrop-blur-sm border border-stone-700/50 rounded-lg px-4 py-2 shadow-lg"
      animate={
        changeDirection === 'up'
          ? { boxShadow: ['0 0 0px #27AE6000', '0 0 20px #27AE6088', '0 0 0px #27AE6000'] }
          : changeDirection === 'down'
          ? { boxShadow: ['0 0 0px #C0392B00', '0 0 20px #C0392B88', '0 0 0px #C0392B00'] }
          : {}
      }
      transition={{ duration: 1.5 }}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <span className="text-amber-400 text-lg">★</span>
        <span className="text-stone-300 text-sm font-semibold tracking-wide uppercase">
          CWS
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative flex-1 min-w-[120px] h-5 bg-stone-800 rounded-full overflow-hidden border border-stone-700/50">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: displayWidth,
            background: 'linear-gradient(90deg, #D4A017, #F4D03F, #F7DC6F)',
            boxShadow: '0 0 8px #F4D03F66',
          }}
        />
        {/* Sheen overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
          }}
        />
      </div>

      {/* Score text */}
      <motion.div
        className="flex items-baseline gap-0.5 min-w-[70px] justify-end"
        key={currentScore}
        initial={{ scale: 1.2 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <span
          className={`text-lg font-bold tabular-nums ${
            changeDirection === 'up'
              ? 'text-emerald-400'
              : changeDirection === 'down'
              ? 'text-red-400'
              : 'text-amber-300'
          }`}
        >
          {currentScore}
        </span>
        <span className="text-stone-500 text-sm">/{targetScore}</span>
      </motion.div>

      {/* Sparkline */}
      <Sparkline data={history} />

      {/* Change indicator */}
      {changeDirection && (
        <motion.span
          initial={{ opacity: 0, y: changeDirection === 'up' ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`text-xs font-bold ${
            changeDirection === 'up' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {changeDirection === 'up' ? '▲' : '▼'}
        </motion.span>
      )}
    </motion.div>
  );
}
