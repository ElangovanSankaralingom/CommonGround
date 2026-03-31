import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '../../utils/sounds';

// --- Phase colors ---
const PHASE_COLORS: Record<number, string> = {
  1: '#F59E0B', 2: '#14B8A6', 3: '#8B5CF6', 4: '#3B82F6', 5: '#22C55E',
};

// --- Inline keyframes (injected once) ---
const STYLE_ID = 'game-env-styles';
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
@keyframes ge-floatUp {
  0%   { transform: translateY(100vh) translateX(0px); opacity: 0; }
  10%  { opacity: 1; }
  50%  { transform: translateY(50vh) translateX(12px); }
  90%  { opacity: 1; }
  100% { transform: translateY(-20px) translateX(-8px); opacity: 0; }
}
@keyframes ge-celebFall {
  0%   { transform: translateY(-40px) rotate(0deg) translateX(0px); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg) translateX(var(--drift)); opacity: 0; }
}
@keyframes ge-sparkleOut {
  0%   { transform: translate(0,0) rotate(45deg) scale(1); opacity: 1; }
  100% { transform: translate(var(--sx), var(--sy)) rotate(45deg) scale(0); opacity: 0; }
}
`;
  document.head.appendChild(style);
}

// --- Background Particles ---
interface ParticleData { x: number; size: number; dur: number; delay: number; }

function useParticles(count: number): ParticleData[] {
  return useMemo(() =>
    Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      size: 2 + Math.random(),
      dur: 15 + Math.random() * 10,
      delay: Math.random() * 15,
    })),
  [count]);
}

function BackgroundParticles({ phase }: { phase: number }) {
  const particles = useParticles(18);
  const color = PHASE_COLORS[phase] ?? PHASE_COLORS[1];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: color,
            opacity: 0.1 + Math.random() * 0.1,
            animation: `ge-floatUp ${p.dur}s ${p.delay}s linear infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

// --- Celebration Particles ---
type CelebKind = 'leaf' | 'petal' | 'drop';
interface CelebParticle { id: number; kind: CelebKind; x: number; dur: number; delay: number; drift: number; }

function makeCelebParticles(count: number): CelebParticle[] {
  const kinds: CelebKind[] = ['leaf', 'petal', 'drop'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    kind: kinds[i % 3],
    x: Math.random() * 100,
    dur: 2 + Math.random() * 3,
    delay: Math.random() * 2,
    drift: -60 + Math.random() * 120,
  }));
}

const celebStyle = (kind: CelebKind): React.CSSProperties => {
  if (kind === 'leaf') return { width: 8, height: 12, borderRadius: '50% 0 50% 0', backgroundColor: '#22C55E' };
  if (kind === 'petal') return { width: 6, height: 10, borderRadius: '50%', backgroundColor: '#F472B6' };
  return { width: 4, height: 4, borderRadius: '50%', backgroundColor: '#60A5FA' };
};

function CelebrationOverlay({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<CelebParticle[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (active) {
      setParticles(makeCelebParticles(50));
      timerRef.current = setTimeout(() => setParticles([]), 4000);
    } else {
      setParticles([]);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            ...celebStyle(p.kind),
            position: 'absolute',
            left: `${p.x}%`,
            top: -40,
            ['--drift' as string]: `${p.drift}px`,
            animation: `ge-celebFall ${p.dur}s ${p.delay}s ease-in forwards`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

// --- Sparkle ---
export function Sparkle({ x, y, color }: { x: number; y: number; color: string }) {
  const dots = useMemo(() =>
    Array.from({ length: 6 + Math.floor(Math.random() * 3) }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 30;
      return { id: i, sx: Math.cos(angle) * dist, sy: Math.sin(angle) * dist };
    }),
  []);

  return (
    <div className="pointer-events-none" style={{ position: 'absolute', left: x, top: y }} aria-hidden>
      {dots.map((d) => (
        <div
          key={d.id}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            backgroundColor: color,
            transform: 'rotate(45deg)',
            ['--sx' as string]: `${d.sx}px`,
            ['--sy' as string]: `${d.sy}px`,
            animation: 'ge-sparkleOut 0.4s ease-out forwards',
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  );
}

// --- Sound Control ---
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3,7 7,7 11,3 11,17 7,13 3,13" fill="currentColor" stroke="none" />
      {!muted && (
        <>
          <path d="M13 7.5 C14 8.5 14 11.5 13 12.5" />
          <path d="M15 5.5 C17 7.5 17 12.5 15 14.5" />
        </>
      )}
      {muted && <line x1="2" y1="2" x2="18" y2="18" strokeWidth="2" />}
    </svg>
  );
}

export function SoundControl() {
  const [muted, setMuted] = useState(sounds.getIsMuted());
  const [showSlider, setShowSlider] = useState(false);
  const [vol, setVol] = useState(sounds.getVolume());
  const longRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (muted) { sounds.unmute(); setMuted(false); }
    else { sounds.mute(); setMuted(true); }
  };

  const onPointerDown = () => { longRef.current = setTimeout(() => setShowSlider(true), 400); };
  const onPointerUp = () => { if (longRef.current) clearTimeout(longRef.current); };

  const onContext = (e: React.MouseEvent) => { e.preventDefault(); setShowSlider((v) => !v); };

  useEffect(() => {
    if (!showSlider) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowSlider(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSlider]);

  return (
    <div ref={panelRef} className="fixed top-3 right-3 z-[60] select-none">
      <button
        onClick={toggle}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onContextMenu={onContext}
        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <SpeakerIcon muted={muted} />
      </button>
      <AnimatePresence>
        {showSlider && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 bg-gray-900/90 rounded-lg p-3 w-36 backdrop-blur"
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVol(v);
                sounds.setVolume(v);
                if (v > 0 && muted) { sounds.unmute(); setMuted(false); }
              }}
              className="w-full accent-white"
            />
            <div className="text-xs text-white/50 mt-1 text-center">{Math.round(vol * 100)}%</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Phase Wipe ---
export function PhaseWipe({ color, active }: { color: string; active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="wipe"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="pointer-events-none fixed inset-0 z-40"
          aria-hidden
        >
          <div className="w-full" style={{ height: 60, backgroundColor: color, opacity: 0.15 }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Main wrapper ---
interface GameEnvironmentProps {
  children: React.ReactNode;
  currentPhase?: number;
  activePlayerId?: string | null;
  showCelebration?: boolean;
}

export default function GameEnvironment({
  children,
  currentPhase = 1,
  activePlayerId: _activePlayerId,
  showCelebration = false,
}: GameEnvironmentProps) {
  useEffect(() => { ensureStyles(); }, []);

  const phase = Math.max(1, Math.min(5, currentPhase));

  return (
    <div className="relative min-h-screen">
      <BackgroundParticles phase={phase} />
      <CelebrationOverlay active={showCelebration} />
      {children}
    </div>
  );
}
