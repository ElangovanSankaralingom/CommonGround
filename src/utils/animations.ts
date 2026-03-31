/**
 * Animation utilities for CommonGround game effects.
 * All animations use CSS transforms and opacity for GPU acceleration.
 */

// ---------------------------------------------------------------------------
// Token Animations (framer-motion variant objects)
// ---------------------------------------------------------------------------

export const tokenFlyAway = {
  initial: { x: 0, y: 0, opacity: 1, scale: 1 },
  animate: { y: -120, x: () => (Math.random() - 0.5) * 60, opacity: 0, scale: 0.5 },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const tokenFlyIn = {
  initial: { y: -100, x: () => (Math.random() - 0.5) * 40, opacity: 0, scale: 0.5 },
  animate: { y: 0, x: 0, opacity: 1, scale: 1 },
  transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }, // bounce
};

export const tokenShimmer = {
  animate: {
    boxShadow: [
      '0 0 0px rgba(255,200,0,0)',
      '0 0 8px rgba(255,200,0,0.6)',
      '0 0 0px rgba(255,200,0,0)',
    ],
  },
  transition: { duration: 1.5, repeat: Infinity },
};

// ---------------------------------------------------------------------------
// Ball Animations
// ---------------------------------------------------------------------------

/** Returns framer-motion animate props for a successful ball pass. */
export function ballPassSuccessAnimation(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  quality: number,
): { animate: object; transition: object } {
  const midX = (fromX + toX) / 2;
  const arcHeight = 40 + quality * 110; // quality 0.5 → 95px, quality 1.0 → 150px
  const midY = Math.min(fromY, toY) - arcHeight;
  return {
    animate: {
      x: [fromX, midX, toX],
      y: [fromY, midY, toY],
      rotate: [0, 180, 360],
      opacity: 1,
    },
    transition: { duration: 0.8, ease: 'easeInOut' },
  };
}

/** Ball drop animation. */
export function ballDropAnimation(
  fromX: number,
  fromY: number,
): { keyframes: object[]; duration: number } {
  const midY = fromY - 60;
  const groundY = fromY + 100;
  return {
    keyframes: [
      { x: fromX, y: fromY, scale: 1, opacity: 1 },
      { x: fromX + 30, y: midY, scale: 1, opacity: 1 },
      { x: fromX + 40, y: groundY, scale: 1, opacity: 0.8 },
      { x: fromX + 40, y: groundY, scaleX: 1.3, scaleY: 0.7 },
      { x: fromX + 40, y: groundY - 30, scale: 1 },
      { x: fromX + 40, y: groundY, scaleX: 1.15, scaleY: 0.85 },
      { x: fromX + 40, y: groundY - 10, scale: 1 },
      { x: fromX + 40, y: groundY, scale: 1, opacity: 0.6 },
    ],
    duration: 1.5,
  };
}

/** Goal shot animation. */
export function ballGoalShotAnimation(
  fromX: number,
  fromY: number,
  targetX: number,
  targetY: number,
  success: boolean,
) {
  if (success) {
    return {
      animate: {
        x: [fromX, targetX],
        y: [fromY, targetY],
        scale: [1.3, 1, 0.5],
        opacity: [1, 1, 0],
      },
      transition: { duration: 0.5, ease: [0.5, 0, 0.75, 0] },
    };
  }
  const missX = targetX + (Math.random() > 0.5 ? 40 : -40);
  return {
    animate: {
      x: [fromX, targetX - 10, missX, missX + 100],
      y: [fromY, targetY, targetY - 20, targetY + 200],
      opacity: [1, 1, 0.8, 0],
    },
    transition: { duration: 0.8, ease: 'easeIn' },
  };
}

// ---------------------------------------------------------------------------
// Scene Transitions
// ---------------------------------------------------------------------------

export const phaseWipeIn = {
  initial: { x: '-100%' },
  animate: { x: '100%' },
  transition: { duration: 0.5, ease: 'linear' },
};

export const fadeInUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' },
});

export const fadeOutDown = {
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

export const staggerContainer = (staggerDelay = 0.1) => ({
  animate: { transition: { staggerChildren: staggerDelay } },
});

export const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

// ---------------------------------------------------------------------------
// Die Roll Helper
// ---------------------------------------------------------------------------

export const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[70, 70]],
  2: [[100, 40], [40, 100]],
  3: [[100, 40], [70, 70], [40, 100]],
  4: [[40, 40], [100, 40], [40, 100], [100, 100]],
  5: [[40, 40], [100, 40], [70, 70], [40, 100], [100, 100]],
  6: [[40, 40], [40, 70], [40, 100], [100, 40], [100, 70], [100, 100]],
};

export const diceShake = {
  animate: {
    x: [0, -3, 3, -2, 2, 0],
    y: [0, 2, -2, 1, -1, 0],
    scale: [1, 1.04, 1.02, 1.05, 1.01, 1],
  },
  transition: { duration: 0.15, repeat: Infinity },
};

export const diceLand = {
  animate: {
    scale: [1.05, 1],
    boxShadow: [
      '0 2px 4px rgba(0,0,0,0.1)',
      '0 4px 12px rgba(0,0,0,0.15)',
    ],
  },
  transition: { duration: 0.2 },
};

// ---------------------------------------------------------------------------
// Celebration Particles
// ---------------------------------------------------------------------------

export interface ParticleConfig {
  count: number;
  colors: string[];
  shapes: ('circle' | 'leaf' | 'diamond')[];
  duration: number;
  spread: number;
}

export const natureCelebration: ParticleConfig = {
  count: 50,
  colors: ['#4CAF50', '#8BC34A', '#FF9800', '#E91E63', '#2196F3'],
  shapes: ['leaf', 'circle', 'diamond'],
  duration: 4,
  spread: 400,
};

export const sparkle: ParticleConfig = {
  count: 8,
  colors: ['#FFD700', '#FFF8DC', '#FFEFD5'],
  shapes: ['diamond'],
  duration: 0.5,
  spread: 60,
};

// ---------------------------------------------------------------------------
// CSS Keyframe Strings (for injection into style tags)
// ---------------------------------------------------------------------------

export const KEYFRAMES = `
@keyframes ripplePulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.5); opacity: 0; }
}
@keyframes floatUp {
  0% { transform: translateY(0); opacity: 0.15; }
  100% { transform: translateY(-100vh); opacity: 0; }
}
@keyframes turnGlow {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -31.4; }
}
`;
