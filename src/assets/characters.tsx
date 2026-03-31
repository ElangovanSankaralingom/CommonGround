import React from 'react';
import { motion } from 'framer-motion';
import type { RoleId } from '../core/models/types';

interface CharacterProps {
  expression?: 'default' | 'concerned' | 'happy' | 'worried';
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 48, md: 80, lg: 120 };

/* Mouth path helper: returns a short path string for the mouth */
function mouthPath(expr: string, cx: number, cy: number): string {
  switch (expr) {
    case 'happy':   return `M${cx - 4},${cy} Q${cx},${cy + 4} ${cx + 4},${cy}`;
    case 'concerned':
    case 'worried': return `M${cx - 3},${cy + 2} Q${cx},${cy - 1} ${cx + 3},${cy + 2}`;
    default:        return `M${cx - 3},${cy} L${cx + 3},${cy}`;
  }
}

/* Eyebrow offset: worried/concerned raises brows */
function browY(expr: string): number {
  return (expr === 'worried' || expr === 'concerned') ? -1.5 : 0;
}

// ─── Administrator ───────────────────────────────────────────────
export function AdminCharacter({ expression = 'default', isActive = false, size = 'md' }: CharacterProps) {
  const s = SIZES[size];
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="adminBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2874B8" />
          <stop offset="100%" stopColor="#0C447C" />
        </linearGradient>
      </defs>
      {/* Background */}
      <circle cx="40" cy="40" r="38" fill="url(#adminBg)" />
      {/* Shoulders */}
      <motion.g
        animate={{ scaleY: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '40px', originY: '70px' }}
      >
        <ellipse cx="40" cy="68" rx="22" ry="12" fill="#185FA5" />
        {/* Collar */}
        <rect x="34" y="56" width="12" height="6" rx="1" fill="#0C447C" />
        {/* Badge */}
        <motion.rect
          x="49" y="60" width="3" height="4" rx="0.5" fill="#FFD700"
          animate={isActive ? { opacity: [0, 0.8, 0] } : {}}
          transition={isActive ? { duration: 2, repeat: Infinity } : {}}
        />
      </motion.g>
      {/* Head */}
      <ellipse cx="40" cy="36" rx="14" ry="16" fill="#E8D5B0" />
      {/* Hair - neat dark */}
      <path d="M26,32 Q28,18 40,16 Q52,18 54,32 Q52,22 40,20 Q28,22 26,32Z" fill="#2C2018" />
      {/* Eyes */}
      <circle cx="35" cy="35" r="1.8" fill="#2C2018" />
      <circle cx="45" cy="35" r="1.8" fill="#2C2018" />
      {/* Eyebrows */}
      <line x1="32" y1={31 + browY(expression)} x2="37" y2={30 + browY(expression)} stroke="#2C2018" strokeWidth="1" strokeLinecap="round" />
      <line x1="43" y1={30 + browY(expression)} x2="48" y2={31 + browY(expression)} stroke="#2C2018" strokeWidth="1" strokeLinecap="round" />
      {/* Mouth */}
      <path d={mouthPath(expression, 40, 43)} stroke="#6B4E3D" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── Investor ────────────────────────────────────────────────────
export function InvestorCharacter({ expression = 'default', isActive = false, size = 'md' }: CharacterProps) {
  const s = SIZES[size];
  const eyeScaleVal = isActive ? [1, 1.1, 1] : [1];
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="investorBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4911F" />
          <stop offset="100%" stopColor="#633806" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#investorBg)" />
      {/* Shoulders */}
      <motion.g
        animate={{ scaleY: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '40px', originY: '70px' }}
      >
        <ellipse cx="40" cy="68" rx="22" ry="12" fill="#BA7517" />
        <rect x="34" y="57" width="12" height="5" rx="1" fill="#633806" />
        {/* Watch at shoulder edge */}
        <circle cx="19" cy="66" r="2.5" stroke="#FFD700" strokeWidth="0.8" fill="none" />
        <motion.line
          x1="19" y1="66" x2="19" y2="64"
          stroke="#FFD700" strokeWidth="0.5"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '19px', originY: '66px' }}
        />
      </motion.g>
      {/* Head */}
      <ellipse cx="40" cy="36" rx="14" ry="16" fill="#E8D5B0" />
      {/* Styled hair - swept back */}
      <path d="M26,34 Q27,16 40,14 Q53,16 54,34 Q53,20 44,18 L36,19 Q28,21 26,34Z" fill="#3D2B1A" />
      {/* Eyes */}
      <motion.g animate={{ scale: eyeScaleVal }} transition={{ duration: 2, repeat: Infinity }}>
        <circle cx="35" cy="35" r="1.8" fill="#3D2B1A" />
        <circle cx="45" cy="35" r="1.8" fill="#3D2B1A" />
      </motion.g>
      {/* Eyebrows */}
      <line x1="32" y1={31 + browY(expression)} x2="37" y2={30.5 + browY(expression)} stroke="#3D2B1A" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="43" y1={30.5 + browY(expression)} x2="48" y2={31 + browY(expression)} stroke="#3D2B1A" strokeWidth="1.2" strokeLinecap="round" />
      {/* Mouth - confident smile default */}
      <path
        d={expression === 'worried'
          ? mouthPath('worried', 40, 43)
          : mouthPath('happy', 40, 43)}
        stroke="#6B4E3D" strokeWidth="1.2" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

// ─── Designer ────────────────────────────────────────────────────
export function DesignerCharacter({ expression = 'default', isActive = false, size = 'md' }: CharacterProps) {
  const s = SIZES[size];
  const eyeH = (isActive || expression === 'happy') ? 3.6 : expression === 'concerned' ? 2 : 2.8;
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="designerBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6B5FD6" />
          <stop offset="100%" stopColor="#3C3489" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#designerBg)" />
      {/* Shoulders */}
      <motion.g
        animate={{ scaleY: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '40px', originY: '70px' }}
      >
        <ellipse cx="40" cy="68" rx="22" ry="12" fill="#534AB7" />
        <rect x="35" y="57" width="10" height="5" rx="1" fill="#3C3489" />
      </motion.g>
      {/* Head */}
      <ellipse cx="40" cy="36" rx="14" ry="16" fill="#E8D5B0" />
      {/* Messy hair */}
      <path d="M25,34 Q26,17 40,15 Q54,17 55,34 Q54,24 48,20 L44,22 L40,18 L36,22 L32,20 Q27,24 25,34Z" fill="#4A3070" />
      {/* Pencil behind ear */}
      <motion.g
        animate={{ rotate: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '56px', originY: '30px' }}
      >
        <rect x="55" y="22" width="2" height="12" rx="0.5" fill="#F0C040" transform="rotate(15,56,28)" />
        <polygon points="55,34 57,34 56,37" fill="#E8D5B0" transform="rotate(15,56,28)" />
      </motion.g>
      {/* Eyes - rects for squint effect */}
      <rect x="33" y={35 - eyeH / 2} width="4" height={eyeH} rx="1.5" fill="#2C2018" />
      <rect x="43" y={35 - eyeH / 2} width="4" height={eyeH} rx="1.5" fill="#2C2018" />
      {/* Eyebrows */}
      <line x1="32" y1={30 + browY(expression)} x2="38" y2={29.5 + browY(expression)} stroke="#4A3070" strokeWidth="1" strokeLinecap="round" />
      <line x1="42" y1={29.5 + browY(expression)} x2="48" y2={30 + browY(expression)} stroke="#4A3070" strokeWidth="1" strokeLinecap="round" />
      {/* Mouth */}
      <path d={mouthPath(expression, 40, 44)} stroke="#6B4E3D" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── Citizen ─────────────────────────────────────────────────────
export function CitizenCharacter({ expression = 'default', isActive = false, size = 'md' }: CharacterProps) {
  const s = SIZES[size];
  const smileW = isActive || expression === 'happy' ? 5 : 4;
  const smileD = isActive || expression === 'happy' ? 5 : 3;
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="citizenBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F8C1E" />
          <stop offset="100%" stopColor="#27500A" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#citizenBg)" />
      {/* Shoulders */}
      <motion.g
        animate={{ scaleY: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '40px', originY: '70px' }}
      >
        <ellipse cx="40" cy="68" rx="22" ry="12" fill="#3B6D11" />
        {/* Scarf */}
        <motion.g
          animate={{ skewX: [-1, 1, -1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <polygon points="34,58 46,58 42,66 38,66" fill="#E05030" />
        </motion.g>
      </motion.g>
      {/* Head */}
      <ellipse cx="40" cy="36" rx="14" ry="16" fill="#E8D5B0" />
      {/* Casual hair */}
      <path d="M26,33 Q28,18 40,16 Q52,18 54,33 Q52,23 46,20 Q40,22 34,20 Q28,23 26,33Z" fill="#5C3D1E" />
      {/* Eyes */}
      <circle cx="35" cy="35" r="1.8" fill="#2C2018" />
      <circle cx="45" cy="35" r="1.8" fill="#2C2018" />
      {/* Eyebrows */}
      <line x1="32" y1={31 + browY(expression)} x2="37" y2={30.5 + browY(expression)} stroke="#5C3D1E" strokeWidth="1" strokeLinecap="round" />
      <line x1="43" y1={30.5 + browY(expression)} x2="48" y2={31 + browY(expression)} stroke="#5C3D1E" strokeWidth="1" strokeLinecap="round" />
      {/* Mouth - warm smile by default */}
      <path
        d={expression === 'worried' || expression === 'concerned'
          ? mouthPath('concerned', 40, 43)
          : `M${40 - smileW},43 Q40,${43 + smileD} ${40 + smileW},43`}
        stroke="#6B4E3D" strokeWidth="1.2" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

// ─── Advocate ────────────────────────────────────────────────────
export function AdvocateCharacter({ expression = 'default', isActive = false, size = 'md' }: CharacterProps) {
  const s = SIZES[size];
  const eyeR = expression === 'worried' || expression === 'concerned' ? 2.2 : 1.8;
  return (
    <svg width={s} height={s} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="advocateBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E87050" />
          <stop offset="100%" stopColor="#993C1D" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="38" fill="url(#advocateBg)" />
      {/* Shoulders */}
      <motion.g
        animate={isActive ? { y: [0, -2, 0] } : { scaleY: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ originX: '40px', originY: '70px' }}
      >
        <ellipse cx="40" cy="68" rx="22" ry="12" fill="#D85A30" />
        <rect x="34" y="57" width="12" height="5" rx="1" fill="#993C1D" />
        {/* Leaf pin */}
        <motion.g
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '50px', originY: '62px' }}
        >
          <path d="M49,60 Q52,56 50,62 Q53,59 51,63Z" fill="#4CAF50" />
          <line x1="50" y1="61" x2="50" y2="64" stroke="#2E7D32" strokeWidth="0.5" />
        </motion.g>
      </motion.g>
      {/* Head */}
      <ellipse cx="40" cy="36" rx="14" ry="16" fill="#E8D5B0" />
      {/* Natural hair - fuller */}
      <path d="M24,36 Q24,14 40,13 Q56,14 56,36 Q55,22 48,18 Q40,16 32,18 Q25,22 24,36Z" fill="#1A1008" />
      {/* Eyes */}
      <circle cx="35" cy="35" r={eyeR} fill="#1A1008" />
      <circle cx="45" cy="35" r={eyeR} fill="#1A1008" />
      {/* Determined eyebrows - slightly angled inward */}
      <line x1="31" y1={32 + browY(expression)} x2="37" y2={30 + browY(expression)} stroke="#1A1008" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="43" y1={30 + browY(expression)} x2="49" y2={32 + browY(expression)} stroke="#1A1008" strokeWidth="1.2" strokeLinecap="round" />
      {/* Mouth */}
      <path
        d={expression === 'happy'
          ? mouthPath('happy', 40, 43)
          : expression === 'worried' || expression === 'concerned'
            ? mouthPath('concerned', 40, 43)
            : `M${37},43 L${43},43`}
        stroke="#6B4E3D" strokeWidth="1.2" strokeLinecap="round" fill="none"
      />
    </svg>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────
const CHARACTER_MAP: Record<RoleId, React.FC<CharacterProps>> = {
  administrator: AdminCharacter,
  investor: InvestorCharacter,
  designer: DesignerCharacter,
  citizen: CitizenCharacter,
  advocate: AdvocateCharacter,
};

interface CharacterPortraitProps extends CharacterProps {
  roleId: RoleId;
}

export function CharacterPortrait({ roleId, ...rest }: CharacterPortraitProps) {
  const Component = CHARACTER_MAP[roleId];
  return <Component {...rest} />;
}
