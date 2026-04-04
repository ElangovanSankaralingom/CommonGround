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
  { icon: '\u{1F3DB}\uFE0F', label: 'Administrator', color: '#C0392B' },
  { icon: '\u{1F4D0}', label: 'Designer', color: '#2E86AB' },
  { icon: '\u{1F3D8}\uFE0F', label: 'Citizen', color: '#27AE60' },
  { icon: '\u{1F4BC}', label: 'Investor', color: '#E67E22' },
  { icon: '\u{1F33F}', label: 'Advocate', color: '#8E44AD' },
];

// ── Tree data: geometric low-poly trees across bottom third ────
interface TreeDef {
  x: number; baseY: number; scale: number;
  type: 'triangle' | 'round';
  pulseOffset: number; // stagger for wave effect
  entranceDelay: number;
}

const TREES: TreeDef[] = [
  { x: 60,   baseY: 620, scale: 0.9,  type: 'triangle', pulseOffset: 0,    entranceDelay: 0.3 },
  { x: 140,  baseY: 600, scale: 1.15, type: 'round',    pulseOffset: 0.8,  entranceDelay: 0.42 },
  { x: 210,  baseY: 630, scale: 0.75, type: 'triangle', pulseOffset: 1.6,  entranceDelay: 0.54 },
  { x: 320,  baseY: 640, scale: 0.65, type: 'round',    pulseOffset: 2.4,  entranceDelay: 0.66 },
  { x: 440,  baseY: 625, scale: 1.0,  type: 'triangle', pulseOffset: 3.2,  entranceDelay: 0.78 },
  { x: 560,  baseY: 650, scale: 0.55, type: 'round',    pulseOffset: 4.0,  entranceDelay: 0.9 },
  { x: 700,  baseY: 620, scale: 1.1,  type: 'triangle', pulseOffset: 4.8,  entranceDelay: 1.02 },
  { x: 810,  baseY: 635, scale: 0.8,  type: 'round',    pulseOffset: 5.6,  entranceDelay: 1.14 },
  { x: 920,  baseY: 610, scale: 1.2,  type: 'triangle', pulseOffset: 6.4,  entranceDelay: 1.26 },
  { x: 1020, baseY: 640, scale: 0.7,  type: 'round',    pulseOffset: 7.2,  entranceDelay: 1.38 },
  { x: 1100, baseY: 625, scale: 0.95, type: 'triangle', pulseOffset: 0.4,  entranceDelay: 1.50 },
  { x: 1160, baseY: 645, scale: 0.6,  type: 'round',    pulseOffset: 1.2,  entranceDelay: 1.62 },
];

// ── Hexagon zone markers ───────────────────────────────────────
interface HexDef { cx: number; cy: number; r: number; color: string; spinDuration: number; entranceDelay: number; }
const HEXAGONS: HexDef[] = [
  { cx: 180,  cy: 160, r: 28, color: '#4CAF50', spinDuration: 55, entranceDelay: 1.5 },
  { cx: 400,  cy: 100, r: 22, color: '#F4D03F', spinDuration: 65, entranceDelay: 1.6 },
  { cx: 650,  cy: 140, r: 32, color: '#E67E22', spinDuration: 50, entranceDelay: 1.7 },
  { cx: 880,  cy: 110, r: 20, color: '#C0392B', spinDuration: 70, entranceDelay: 1.8 },
  { cx: 1050, cy: 170, r: 25, color: '#2E86AB', spinDuration: 60, entranceDelay: 1.9 },
];

// ── Firefly data (CSS animated) ────────────────────────────────
interface FireflyDef {
  id: number; left: number; top: number; size: number;
  color: string; driftDuration: number; glowDuration: number;
  glowDelay: number; driftDelay: number;
  fx1: number; fy1: number; fx2: number; fy2: number; fx3: number; fy3: number;
}

const FIREFLY_COLORS = ['#F4D03F', '#7BA05B', '#87CEEB'];

const FIREFLIES: FireflyDef[] = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: 5 + Math.random() * 80,
  size: 2 + Math.random() * 2.5,
  color: FIREFLY_COLORS[i % 3],
  driftDuration: 15 + Math.random() * 12,
  glowDuration: 3 + Math.random() * 2.5,
  glowDelay: Math.random() * 5,
  driftDelay: Math.random() * 8,
  fx1: (Math.random() - 0.5) * 80,
  fy1: (Math.random() - 0.5) * 60,
  fx2: (Math.random() - 0.5) * 70,
  fy2: (Math.random() - 0.5) * 50,
  fx3: (Math.random() - 0.5) * 90,
  fy3: (Math.random() - 0.5) * 40,
}));

// ── Falling leaf data (CSS animated) ───────────────────────────
interface LeafDef {
  id: number; left: number; duration: number; delay: number;
  sway: number; spin: number; opacity: number; color: string;
}

const LEAF_COLORS = ['#D4A017', '#C75B39', '#808000', '#B8860B', '#A0522D'];

const FALLING_LEAVES: LeafDef[] = Array.from({ length: 7 }, (_, i) => ({
  id: i,
  left: 8 + Math.random() * 84,
  duration: 20 + Math.random() * 12,
  delay: 2.5 + Math.random() * 6,
  sway: 40 + Math.random() * 80 * (i % 2 === 0 ? 1 : -1),
  spin: 180 + Math.random() * 360 * (i % 2 === 0 ? 1 : -1),
  opacity: 0.12 + Math.random() * 0.18,
  color: LEAF_COLORS[i % LEAF_COLORS.length],
}));

// ── Hexagon SVG path helper ────────────────────────────────────
function hexPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let a = 0; a < 6; a++) {
    const angle = (Math.PI / 3) * a - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join('L')}Z`;
}

// ── Layer 2: Geometric Park SVG ────────────────────────────────
function ParkScene() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="treeGradMuted" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5C7A5C" />
          <stop offset="100%" stopColor="#4A6B3A" />
        </linearGradient>
        <radialGradient id="fountainGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2E86AB" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2E86AB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Pathways (draw-in animation via CSS) ────────── */}
      <path
        d="M-20,710 Q200,660 400,690 Q600,720 800,680 Q1000,650 1220,695"
        stroke="#D4A574"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        opacity="0.15"
        strokeDasharray="2000"
        strokeDashoffset="2000"
        style={{ animation: 'pathDraw 2.5s ease-out 0.8s forwards' }}
      />
      <path
        d="M100,740 Q300,700 500,730 Q700,755 900,720 Q1050,700 1200,740"
        stroke="#D4A574"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.1"
        strokeDasharray="1800"
        strokeDashoffset="1800"
        style={{ animation: 'pathDraw 2.8s ease-out 1.0s forwards' }}
      />

      {/* ── Trees: geometric shapes that grow + pulse ───── */}
      {TREES.map((t, i) => (
        <g
          key={i}
          style={{
            transformOrigin: `${t.x}px ${t.baseY}px`,
            animation: `treeGrow 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${t.entranceDelay}s both`,
          }}
        >
          {/* Trunk */}
          <rect
            x={t.x - 3 * t.scale}
            y={t.baseY - 50 * t.scale}
            width={6 * t.scale}
            height={50 * t.scale}
            fill="#6B4226"
            opacity="0.5"
            rx="2"
          />
          {/* Canopy — pulses muted ↔ vibrant in wave */}
          <g
            style={{
              willChange: 'opacity, filter',
              animation: `treePulse 8s ease-in-out ${t.pulseOffset}s infinite`,
            }}
          >
            {t.type === 'triangle' ? (
              <>
                <polygon
                  points={`${t.x},${t.baseY - 50 * t.scale - 45 * t.scale} ${t.x - 28 * t.scale},${t.baseY - 50 * t.scale + 10 * t.scale} ${t.x + 28 * t.scale},${t.baseY - 50 * t.scale + 10 * t.scale}`}
                  fill="#5C7A5C"
                />
                <polygon
                  points={`${t.x},${t.baseY - 50 * t.scale - 60 * t.scale} ${t.x - 20 * t.scale},${t.baseY - 50 * t.scale - 15 * t.scale} ${t.x + 20 * t.scale},${t.baseY - 50 * t.scale - 15 * t.scale}`}
                  fill="#4CAF50"
                  opacity="0.85"
                />
              </>
            ) : (
              <>
                <circle
                  cx={t.x}
                  cy={t.baseY - 50 * t.scale - 15 * t.scale}
                  r={30 * t.scale}
                  fill="#5C7A5C"
                />
                <circle
                  cx={t.x - 10 * t.scale}
                  cy={t.baseY - 50 * t.scale - 25 * t.scale}
                  r={20 * t.scale}
                  fill="#4CAF50"
                  opacity="0.75"
                />
              </>
            )}
          </g>
        </g>
      ))}

      {/* ── Benches ─────────────────────────────────────── */}
      <g opacity="0.25" style={{ animation: 'fadeInScale 1s ease-out 1.2s both' }}>
        {/* Bench 1 — near left path */}
        <rect x="310" y="685" width="40" height="3" fill="#8B6F47" rx="1.5" />
        <rect x="314" y="688" width="3" height="10" fill="#8B6F47" rx="1" />
        <rect x="343" y="688" width="3" height="10" fill="#8B6F47" rx="1" />
        <rect x="310" y="678" width="40" height="2.5" fill="#8B6F47" rx="1" opacity="0.7" />
        {/* Bench 2 — center right */}
        <rect x="780" y="695" width="36" height="3" fill="#8B6F47" rx="1.5" />
        <rect x="783" y="698" width="3" height="9" fill="#8B6F47" rx="1" />
        <rect x="809" y="698" width="3" height="9" fill="#8B6F47" rx="1" />
        <rect x="780" y="688" width="36" height="2.5" fill="#8B6F47" rx="1" opacity="0.7" />
        {/* Bench 3 — far right */}
        <rect x="1030" y="710" width="32" height="3" fill="#8B6F47" rx="1.5" />
        <rect x="1033" y="713" width="3" height="8" fill="#8B6F47" rx="1" />
        <rect x="1055" y="713" width="3" height="8" fill="#8B6F47" rx="1" />
      </g>

      {/* ── Fountain — center-right with pulsing glow ─── */}
      <g style={{ animation: 'fadeInScale 0.8s ease-out 3.0s both' }}>
        {/* Water pool */}
        <circle cx="850" cy="670" r="24" fill="#2E86AB" opacity="0.08" />
        {/* Glow pulse */}
        <circle
          cx="850" cy="670" r="35"
          fill="url(#fountainGlow)"
          style={{
            willChange: 'opacity, transform',
            transformOrigin: '850px 670px',
            animation: 'fountainPulse 4s ease-in-out infinite',
          }}
        />
        {/* Basin ring */}
        <circle cx="850" cy="670" r="18" fill="none" stroke="#2E86AB" strokeWidth="1.5" opacity="0.2" />
        {/* Radiating water lines */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <line
            key={angle}
            x1={850 + 10 * Math.cos((angle * Math.PI) / 180)}
            y1={670 + 10 * Math.sin((angle * Math.PI) / 180)}
            x2={850 + 22 * Math.cos((angle * Math.PI) / 180)}
            y2={670 + 22 * Math.sin((angle * Math.PI) / 180)}
            stroke="#2E86AB"
            strokeWidth="1"
            opacity="0.15"
            strokeLinecap="round"
          />
        ))}
        {/* Center spout */}
        <circle cx="850" cy="670" r="4" fill="#2E86AB" opacity="0.25" />
      </g>

      {/* ── Hexagons — zone markers, slow spin ──────────── */}
      {HEXAGONS.map((h, i) => (
        <g
          key={i}
          style={{
            transformOrigin: `${h.cx}px ${h.cy}px`,
            willChange: 'transform',
            animation: `hexSpin ${h.spinDuration}s linear infinite, fadeInScale 0.5s ease-out ${h.entranceDelay}s both`,
          }}
        >
          <path
            d={hexPath(h.cx, h.cy, h.r)}
            fill="none"
            stroke={h.color}
            strokeWidth="1"
            opacity="0.07"
          />
          <path
            d={hexPath(h.cx, h.cy, h.r * 0.6)}
            fill={h.color}
            opacity="0.04"
          />
        </g>
      ))}
    </svg>
  );
}

// ── Layer 3a: Fireflies (pure CSS) ─────────────────────────────
function Fireflies() {
  return (
    <>
      {FIREFLIES.map((f) => (
        <div
          key={f.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            width: f.size,
            height: f.size,
            backgroundColor: f.color,
            boxShadow: `0 0 ${f.size * 2}px ${f.color}, 0 0 ${f.size * 4}px ${f.color}44`,
            willChange: 'transform, opacity',
            '--fx1': `${f.fx1}px`,
            '--fy1': `${f.fy1}px`,
            '--fx2': `${f.fx2}px`,
            '--fy2': `${f.fy2}px`,
            '--fx3': `${f.fx3}px`,
            '--fy3': `${f.fy3}px`,
            animation: `fireflyDrift ${f.driftDuration}s ease-in-out ${f.driftDelay}s infinite, fireflyGlow ${f.glowDuration}s ease-in-out ${f.glowDelay}s infinite`,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

// ── Layer 3b: Falling leaves (pure CSS) ────────────────────────
function FallingLeaves() {
  return (
    <>
      {FALLING_LEAVES.map((l) => (
        <svg
          key={l.id}
          className="absolute pointer-events-none"
          style={{
            left: `${l.left}%`,
            top: '-3%',
            width: 14,
            height: 20,
            willChange: 'transform, opacity',
            '--leaf-sway': `${l.sway}px`,
            '--leaf-spin': `${l.spin}deg`,
            '--leaf-opacity': `${l.opacity}`,
            animation: `leafFall ${l.duration}s ease-in ${l.delay}s infinite`,
            opacity: 0,
          } as React.CSSProperties}
          viewBox="0 0 14 20"
        >
          <path
            d="M7 0 C10 5, 13 10, 7 20 C1 10, 4 5, 7 0Z"
            fill={l.color}
          />
          <line x1="7" y1="2" x2="7" y2="18" stroke={l.color} strokeWidth="0.5" opacity="0.5" />
        </svg>
      ))}
    </>
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
            Shared Vision Score measures how well the group balances individual interests
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
// ═══════════════════════════════════════════════════════════════
// GAME MODE SELECTOR — shown after clicking "New Game"
// ═══════════════════════════════════════════════════════════════

const G = {
  primary: '#aed456', tertiary: '#e9c349', surface: '#16130c',
  container: '#221f18', containerLow: '#1e1b14', onSurface: '#e9e2d5',
  onSurfaceVariant: '#c6c8b8', outlineVariant: '#45483c',
  fontHeadline: 'Epilogue, sans-serif', fontBody: 'Manrope, sans-serif', fontNumber: 'Georgia, serif',
};

const MODE_SESSIONS = [
  { id: 'session1', label: 'Session 1', rounds: [{ zone: 'Walking Track', diff: 2 }, { zone: 'Boating Pond', diff: 3 }, { zone: 'Playground', diff: 3 }] },
  { id: 'session2', label: 'Session 2', rounds: [{ zone: 'Herbal Garden', diff: 2 }, { zone: 'Fountain Plaza', diff: 3 }, { zone: 'Main Entrance', diff: 4 }] },
  { id: 'session3', label: 'Session 3', rounds: [{ zone: 'Open Lawn', diff: 2 }, { zone: 'Nursery Area', diff: 3 }, { zone: 'PPP Zone', diff: 4 }] },
  { id: 'session4', label: 'Session 4', rounds: [{ zone: 'Staff Quarters', diff: 2 }, { zone: 'Peripheral Walk', diff: 3 }, { zone: 'South Pond', diff: 3 }] },
  { id: 'session5', label: 'Session 5', rounds: [{ zone: 'Compost Area', diff: 2 }, { zone: 'Water Tank', diff: 3 }, { zone: 'Walking Track', diff: 3 }] },
];

const PILOT_ZONES = [
  { id: 'z1', name: 'Main Entrance', diff: 4 }, { id: 'z2', name: 'Fountain Plaza', diff: 3 },
  { id: 'z3', name: 'Boating Pond', diff: 3 }, { id: 'z4', name: 'Herbal Garden', diff: 2 },
  { id: 'z5', name: 'Walking Track', diff: 2 }, { id: 'z6', name: 'Playground', diff: 3 },
  { id: 'z7', name: 'Open Lawn', diff: 2 }, { id: 'z8', name: 'Nursery Area', diff: 3 },
  { id: 'z9', name: 'Staff Quarters', diff: 2 }, { id: 'z10', name: 'Peripheral Walk', diff: 3 },
  { id: 'z11', name: 'South Pond', diff: 3 }, { id: 'z12', name: 'Compost Area', diff: 2 },
  { id: 'z13', name: 'PPP Zone', diff: 4 }, { id: 'z14', name: 'Water Tank', diff: 3 },
];

function dots(n: number) {
  return Array.from({ length: 5 }, (_, i) => i < n ? '\u25CF' : '\u25CB').join('');
}

function GameModeSelector({ onBack, onStartGame }: { onBack: () => void; onStartGame: () => void }) {
  const [selectedSession, setSelSession] = useState<string | null>(null);
  const [playerNames, setNames] = useState(['', '', '', '', '']);
  const [showPilot, setShowPilot] = useState(false);
  const [pilotZone, setPilotZone] = useState<string | null>(null);
  const [pilotNames, setPilotNames] = useState(['', '', '', '', '']);

  const playCounts: Record<string, number> = (() => {
    try { return JSON.parse(localStorage.getItem('commonground_play_counts') || '{}'); } catch { return {}; }
  })();
  const pilotCount = (() => {
    try { return parseInt(localStorage.getItem('cg_pilot_count') || '0', 10); } catch { return 0; }
  })();
  const totalFormal = MODE_SESSIONS.reduce((s, ses) => s + (playCounts[ses.id] || 0), 0);

  const canStartFormal = selectedSession && playerNames.every(n => n.trim() !== '');
  const canStartPilot = pilotZone && pilotNames.every(n => n.trim() !== '');

  return (
    <div style={{ minHeight: '100vh', background: G.surface, color: G.onSurface, fontFamily: G.fontBody, overflowY: 'auto', padding: '20px' }}>
      {/* Back button */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: G.onSurfaceVariant, fontFamily: G.fontBody, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
        {'\u2190'} Back
      </button>

      <h1 style={{ fontFamily: G.fontHeadline, fontSize: 24, color: G.onSurface, textAlign: 'center', margin: '0 0 24px' }}>Select Game Mode</h1>

      {/* ═══ SECTION 1: ACTUAL PLAYTEST ═══ */}
      <div style={{ maxWidth: 1020, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.primary, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>ACTUAL PLAYTEST</div>
        <div style={{ fontSize: 11, color: G.onSurfaceVariant, marginBottom: 12 }}>Full 3-round session for formal data collection</div>

        {/* 5 session cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10, justifyContent: 'center', marginBottom: 12 }}>
          {MODE_SESSIONS.map(ses => {
            const count = playCounts[ses.id] || 0;
            const isSel = selectedSession === ses.id;
            return (
              <div key={ses.id} onClick={() => { setSelSession(ses.id); setShowPilot(false); }}
                style={{
                  width: 175, padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                  background: isSel ? `${G.primary}08` : G.container,
                  border: isSel ? `2px solid ${G.primary}` : `1px solid ${G.outlineVariant}`,
                  transition: 'border-color 0.15s',
                }}>
                <div style={{ fontFamily: G.fontHeadline, fontSize: 15, marginBottom: 6 }}>{ses.label}</div>
                {ses.rounds.map((r, ri) => (
                  <div key={ri} style={{ fontSize: 10, color: G.onSurfaceVariant, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>R{ri + 1}: {r.zone}</span>
                    <span style={{ letterSpacing: 1.5 }}>
                      {dots(r.diff).split('').map((c, ci) => <span key={ci} style={{ color: c === '\u25CF' ? G.tertiary : G.outlineVariant, fontSize: 8 }}>{c}</span>)}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 6, fontSize: 10, fontFamily: G.fontNumber, color: count > 0 ? G.primary : G.outlineVariant }}>
                  Played: {count} time{count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Formal counter */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: G.onSurfaceVariant, marginBottom: 4 }}>Formal Sessions: {totalFormal} / 30 target</div>
          <div style={{ height: 5, borderRadius: 3, background: G.outlineVariant, overflow: 'hidden', maxWidth: 400, margin: '0 auto' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (totalFormal / 30) * 100)}%`, background: G.primary, borderRadius: 3 }} />
          </div>
        </div>

        {/* Player setup for formal session */}
        {selectedSession && (
          <div style={{ maxWidth: 500, margin: '16px auto 0', background: G.containerLow, borderRadius: 10, padding: '20px 24px', border: `1px solid ${G.outlineVariant}` }}>
            <div style={{ fontFamily: G.fontHeadline, fontSize: 16, marginBottom: 2 }}>
              {MODE_SESSIONS.find(s => s.id === selectedSession)?.label} — Player Setup
            </div>
            <div style={{ fontSize: 12, color: G.tertiary, fontFamily: G.fontNumber, marginBottom: 14 }}>
              Play #{(playCounts[selectedSession] || 0) + 1}
            </div>
            {playerNames.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: G.fontNumber, fontSize: 13, color: G.onSurfaceVariant, width: 24 }}>P{i + 1}</span>
                <input value={name} onChange={e => { const n = [...playerNames]; n[i] = e.target.value; setNames(n); }} placeholder="Player name"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: `1px solid ${G.outlineVariant}`, background: G.container, color: G.onSurface, fontFamily: G.fontBody, fontSize: 13, outline: 'none' }} />
              </div>
            ))}
            <button onClick={() => { console.log('SESSION_START:', selectedSession, playerNames); onStartGame(); }} disabled={!canStartFormal}
              style={{ marginTop: 8, width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: canStartFormal ? 'pointer' : 'not-allowed', background: canStartFormal ? G.primary : G.outlineVariant, color: canStartFormal ? G.surface : G.onSurfaceVariant, fontFamily: G.fontHeadline, fontSize: 15, fontWeight: 600, opacity: canStartFormal ? 1 : 0.4 }}>
              Start Session {'\u2192'}
            </button>
          </div>
        )}
      </div>

      {/* ═══ DIVIDER ═══ */}
      <div style={{ maxWidth: 700, margin: '24px auto', borderTop: `1px solid ${G.outlineVariant}20` }} />

      {/* ═══ SECTION 2: PILOT TEST ═══ */}
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: G.tertiary, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>PILOT TEST</div>
        <div style={{ fontSize: 11, color: G.onSurfaceVariant, marginBottom: 8 }}>Quick single-round test for calibration (max 3)</div>
        <div style={{ fontSize: 11, color: G.tertiary, marginBottom: 12 }}>
          Pilot tests: {pilotCount} / 3 completed {pilotCount >= 3 && <span style={{ color: G.primary }}>{'\u2713'} All pilots done</span>}
        </div>

        <button onClick={() => { setShowPilot(!showPilot); setSelSession(null); }}
          style={{ padding: '9px 20px', borderRadius: 6, cursor: 'pointer', background: `${G.tertiary}15`, border: `1px solid ${G.tertiary}40`, color: G.tertiary, fontFamily: G.fontBody, fontSize: 12, marginBottom: 12 }}>
          {showPilot ? 'Hide Pilot Setup' : 'Start Pilot Test'}
        </button>

        {showPilot && (
          <div style={{ background: G.containerLow, borderRadius: 10, padding: '20px 24px', border: `1px solid ${G.tertiary}30` }}>
            <div style={{ fontSize: 11, color: G.onSurfaceVariant, marginBottom: 8 }}>SELECT ZONE:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
              {PILOT_ZONES.map(z => (
                <div key={z.id} onClick={() => setPilotZone(z.id)}
                  style={{
                    padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 10,
                    background: pilotZone === z.id ? `${G.tertiary}15` : G.container,
                    border: pilotZone === z.id ? `1px solid ${G.tertiary}` : `1px solid ${G.outlineVariant}30`,
                    color: pilotZone === z.id ? G.tertiary : G.onSurfaceVariant,
                  }}>
                  <div style={{ fontWeight: 600 }}>{z.name}</div>
                  <div style={{ letterSpacing: 1, marginTop: 2 }}>
                    {dots(z.diff).split('').map((c, ci) => <span key={ci} style={{ color: c === '\u25CF' ? G.tertiary : G.outlineVariant, fontSize: 7 }}>{c}</span>)}
                  </div>
                </div>
              ))}
            </div>
            {pilotNames.map((name, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontFamily: G.fontNumber, fontSize: 13, color: G.onSurfaceVariant, width: 24 }}>P{i + 1}</span>
                <input value={name} onChange={e => { const n = [...pilotNames]; n[i] = e.target.value; setPilotNames(n); }} placeholder="Player name"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: `1px solid ${G.outlineVariant}`, background: G.container, color: G.onSurface, fontFamily: G.fontBody, fontSize: 13, outline: 'none' }} />
              </div>
            ))}
            <button onClick={() => { console.log('PILOT_START:', pilotZone, pilotNames); onStartGame(); }} disabled={!canStartPilot}
              style={{ marginTop: 8, width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', cursor: canStartPilot ? 'pointer' : 'not-allowed', background: canStartPilot ? G.tertiary : G.outlineVariant, color: canStartPilot ? G.surface : G.onSurfaceVariant, fontFamily: G.fontHeadline, fontSize: 15, fontWeight: 600, opacity: canStartPilot ? 1 : 0.4 }}>
              Start Pilot {'\u2192'}
            </button>
            {pilotCount >= 3 && (
              <div style={{ marginTop: 8, fontSize: 10, color: G.onSurfaceVariant, fontStyle: 'italic', textAlign: 'center' }}>
                Pilot target reached. Consider starting formal sessions.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TitleScreen() {
  const initializeGame = useGameStore((s) => s.initializeGame);
  const loadGame = useGameStore((s) => s.loadGame);

  const [taglineIndex, setTaglineIndex] = useState(0);
  const [showAbout, setShowAbout] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate taglines every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const actuallyStartGame = useCallback(() => {
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

  const handleNewGame = useCallback(() => {
    setShowModeSelector(true);
  }, []);

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

  // ═══ GAME MODE SELECTOR SCREEN ═══
  if (showModeSelector) {
    return <GameModeSelector onBack={() => setShowModeSelector(false)} onStartGame={actuallyStartGame} />;
  }

  return (
    <motion.div
      className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ── Layer 1: Animated Base Gradient ────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              180deg,
              #0A1628 0%,
              #1B3A5C 25%,
              #4A2040 50%,
              #2C1810 85%,
              #1E0F08 100%
            )
          `,
          backgroundSize: '100% 110%',
          animation: 'gradientShift 30s ease-in-out infinite',
        }}
      />

      {/* ── Layer 2: SVG Park Elements ─────────────────────── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <ParkScene />
      </motion.div>

      {/* ── Layer 3: Particle System ───────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Fireflies />
        <FallingLeaves />
      </div>

      {/* ── Layer 4: Noise/Grain Texture Overlay ───────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          opacity: 0.4,
          zIndex: 4,
        }}
      />

      {/* ── Readability overlay — soft radial behind content ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 50% 45%, rgba(10, 10, 20, 0.55) 0%, transparent 70%),
            linear-gradient(to bottom, rgba(10, 22, 40, 0.2) 0%, transparent 25%, transparent 75%, rgba(10, 22, 40, 0.3) 100%)
          `,
          zIndex: 5,
        }}
      />

      {/* ── Main content ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-2xl" style={{ zIndex: 10 }}>

        {/* Title */}
        <motion.h1
          className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-[0.12em] text-center"
          style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            color: '#F5F0E8',
            textShadow: '0 0 40px rgba(244, 208, 63, 0.15), 0 0 80px rgba(244, 208, 63, 0.05), 0 4px 16px rgba(0,0,0,0.5)',
          }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.8, ease: 'easeOut' }}
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
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          A Collaborative Placemaking Game
        </motion.p>

        {/* Rotating tagline */}
        <motion.div
          className="h-8 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
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
          transition={{ delay: 1.6, duration: 0.6 }}
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
          transition={{ delay: 1.7, duration: 0.5 }}
        >
          {ROLES.map((role, i) => (
            <motion.div
              key={role.label}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7 + i * 0.12, duration: 0.5 }}
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
                transition={{ delay: 2.0 + i * 0.12, duration: 0.5 }}
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
          transition={{ delay: 2.2, duration: 0.5, ease: 'easeOut' }}
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
        transition={{ delay: 2.8, duration: 0.8 }}
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
