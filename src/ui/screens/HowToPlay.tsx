import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Design tokens ─────────────────────────────────────────────
const T = {
  primary: '#aed456',
  secondary: '#f4bb92',
  tertiary: '#e9c349',
  surface: '#16130c',
  container: '#221f18',
  foundation: '#5d8ac4',
  activation: '#e9c349',
  sustainability: '#aed456',
  text: '#f5f0e8',
  textMuted: 'rgba(245, 240, 232, 0.55)',
  fontHeadline: "'Epilogue', sans-serif",
  fontBody: "'Manrope', sans-serif",
  fontNumber: "'Georgia', serif",
};

// ── Role data ─────────────────────────────────────────────────
const ROLES = [
  { icon: '\u{1F3DB}\uFE0F', name: 'Administrator', color: '#C0392B', desc: 'Manages budgets & permits' },
  { icon: '\u{1F4D0}', name: 'Designer', color: '#2E86AB', desc: 'Plans spaces & aesthetics' },
  { icon: '\u{1F3D8}\uFE0F', name: 'Citizen', color: '#27AE60', desc: 'Voices community needs' },
  { icon: '\u{1F4BC}', name: 'Investor', color: '#E67E22', desc: 'Funds & sustains projects' },
  { icon: '\u{1F33F}', name: 'Advocate', color: '#8E44AD', desc: 'Champions accessibility' },
];

// ── Phase data ────────────────────────────────────────────────
const PHASES = [
  { num: 1, name: 'Challenge Card', icon: '\u{1F3B4}', color: T.secondary, desc: 'Discover the zone & its issues' },
  { num: 2, name: 'Investigation', icon: '\u{1F50D}', color: T.foundation, desc: 'Search for clues in the zone' },
  { num: 3, name: 'Vision Board', icon: '\u{1F4CB}', color: T.activation, desc: 'Pick features & negotiate together' },
  { num: 4, name: 'Series Building', icon: '\u{1F3D7}\uFE0F', color: T.sustainability, desc: 'Assemble task cards into action chains' },
  { num: 5, name: 'Scoring', icon: '\u{2B50}', color: T.primary, desc: 'Park Guardian evaluates your plan' },
];

// ── Combination multiplier data ───────────────────────────────
const COMBOS = [
  { roles: 1, mult: '×1.0' },
  { roles: 2, mult: '×1.3' },
  { roles: 3, mult: '×1.6' },
  { roles: 4, mult: '×2.0' },
  { roles: 5, mult: '×2.5' },
];

// ── Slide definitions ─────────────────────────────────────────
interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  accent: string;
}

const SLIDES: Slide[] = [
  { id: 'welcome', title: 'Welcome to CommonGround', subtitle: 'A collaborative placemaking game', accent: T.primary },
  { id: 'story', title: 'The Story', subtitle: 'Corporation Eco-Park, Madurai', accent: T.secondary },
  { id: 'roles', title: 'Five Roles, One Park', subtitle: 'Each perspective matters', accent: '#2E86AB' },
  { id: 'resources', title: 'Resources & Budget', subtitle: 'Spend wisely together', accent: T.tertiary },
  { id: 'phases', title: '5 Phases per Round', subtitle: '3 rounds per session', accent: T.foundation },
  { id: 'investigation', title: 'Investigation', subtitle: 'Hidden object scene', accent: '#7BA05B' },
  { id: 'cards', title: 'Card Assembly', subtitle: 'Action → Method → Who → Outcome', accent: T.secondary },
  { id: 'multiplier', title: 'Collaboration Multiplier', subtitle: 'More roles = bigger impact', accent: T.primary },
  { id: 'guardian', title: 'Park Guardian', subtitle: 'The threshold challenge', accent: T.activation },
  { id: 'remember', title: 'Remember', subtitle: 'No winners. No losers. Only better places.', accent: T.primary },
];

const AUTO_ADVANCE_MS = 20000;

// ── Keyframe CSS (injected once) ──────────────────────────────
const KEYFRAMES = `
@keyframes htpShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes htpPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
@keyframes htpFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes htpFadeUp {
  0% { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes htpGlow {
  0%, 100% { box-shadow: 0 0 12px rgba(174,212,86,0.2); }
  50% { box-shadow: 0 0 28px rgba(174,212,86,0.5); }
}
@keyframes htpProgressFill {
  0% { width: 0%; }
  100% { width: 100%; }
}
@keyframes htpSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

interface HowToPlayProps {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: HowToPlayProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const styleInjected = useRef(false);

  // Inject keyframes once
  useEffect(() => {
    if (styleInjected.current) return;
    styleInjected.current = true;
    const style = document.createElement('style');
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        if (c < SLIDES.length - 1) {
          setDirection(1);
          return c + 1;
        }
        return c;
      });
    }, AUTO_ADVANCE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, current]);

  const goTo = useCallback((idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const goNext = useCallback(() => {
    if (current < SLIDES.length - 1) { setDirection(1); setCurrent(c => c + 1); }
  }, [current]);

  const goBack = useCallback(() => {
    if (current > 0) { setDirection(-1); setCurrent(c => c - 1); }
  }, [current]);

  // Keyboard
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') goBack();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [goNext, goBack, onClose]);

  const slide = SLIDES[current];
  const progress = ((current + 1) / SLIDES.length) * 100;

  // ── Stagger helper ──────────────────────────────────────────
  const stagger = (i: number) => ({
    animation: `htpFadeUp 0.5s ease ${0.15 + i * 0.1}s both`,
  });

  // ── Slide content renderers ─────────────────────────────────

  const renderWelcome = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 40px' }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'htpFloat 3s ease-in-out infinite' }}>{'\u{1F3DE}\uFE0F'}</div>
      <h1 style={{ fontFamily: T.fontHeadline, fontSize: 48, fontWeight: 800, color: T.primary, marginBottom: 12, ...stagger(0),
        background: `linear-gradient(90deg, ${T.primary}, ${T.tertiary}, ${T.primary})`,
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animationName: 'htpShimmer, htpFadeUp',
        animationDuration: '3s, 0.5s',
        animationTimingFunction: 'linear, ease',
        animationIterationCount: 'infinite, 1',
        animationDelay: '0s, 0.15s',
        animationFillMode: 'both',
      }}>CommonGround</h1>
      <p style={{ fontFamily: T.fontBody, fontSize: 20, color: T.textMuted, maxWidth: 520, lineHeight: 1.6, ...stagger(1) }}>
        A collaborative placemaking game where 5 stakeholders redesign a real park together. No winners. No losers. Only better places.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 32, ...stagger(2) }}>
        {ROLES.map(r => (
          <div key={r.name} style={{ width: 48, height: 48, borderRadius: '50%', background: r.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: `2px solid ${r.color}44` }}>
            {r.icon}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStory = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 40px' }}>
      <div style={{ fontSize: 56, marginBottom: 20, ...stagger(0) }}>{'\u{1F3D9}\uFE0F'}</div>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 32, fontWeight: 700, color: T.secondary, marginBottom: 16, ...stagger(1) }}>
        Corporation Eco-Park, Madurai
      </h2>
      <p style={{ fontFamily: T.fontBody, fontSize: 18, color: T.text, maxWidth: 560, lineHeight: 1.7, marginBottom: 20, ...stagger(2) }}>
        A 26-acre urban park in South India — once a vibrant green lung, now facing neglect, encroachment, and competing visions for its future.
      </p>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', ...stagger(3) }}>
        {[
          { label: '14 Zones', icon: '\u{1F4CD}' },
          { label: '3 Rounds', icon: '\u{1F504}' },
          { label: '5 Players', icon: '\u{1F465}' },
        ].map(item => (
          <div key={item.label} style={{ padding: '12px 24px', borderRadius: 12, background: T.container, border: `1px solid ${T.secondary}33` }}>
            <span style={{ fontSize: 24, marginRight: 8 }}>{item.icon}</span>
            <span style={{ fontFamily: T.fontBody, fontSize: 16, color: T.text, fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRoles = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 32px' }}>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 28, textAlign: 'center', ...stagger(0) }}>
        Every perspective shapes the park
      </h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 720 }}>
        {ROLES.map((r, i) => (
          <div key={r.name} style={{
            width: 128, padding: '20px 12px', borderRadius: 16, background: T.container,
            border: `2px solid ${r.color}55`, textAlign: 'center',
            animation: `htpFadeUp 0.5s ease ${0.2 + i * 0.12}s both`,
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>{r.icon}</div>
            <div style={{ fontFamily: T.fontHeadline, fontSize: 14, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>{r.desc}</div>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 14, color: T.textMuted, marginTop: 24, textAlign: 'center', maxWidth: 480, ...stagger(6) }}>
        Each role sees different things during investigation and has unique capabilities to activate.
      </p>
    </div>
  );

  const renderResources = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: T.tertiary, marginBottom: 8, ...stagger(0) }}>
        Resources & Budget
      </h2>
      <p style={{ fontFamily: T.fontBody, fontSize: 16, color: T.textMuted, maxWidth: 500, marginBottom: 28, ...stagger(1) }}>
        Your group shares a resource pool. Every feature on the Vision Board costs resources — choose wisely!
      </p>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', ...stagger(2) }}>
        {[
          { name: 'Foundation', icon: '\u{1F9F1}', color: T.foundation, desc: 'Infrastructure & safety' },
          { name: 'Activation', icon: '\u{2728}', color: T.activation, desc: 'Events & programs' },
          { name: 'Sustainability', icon: '\u{1F33F}', color: T.sustainability, desc: 'Long-term maintenance' },
        ].map((layer, i) => (
          <div key={layer.name} style={{
            width: 180, padding: '20px 16px', borderRadius: 16, background: T.container,
            border: `2px solid ${layer.color}44`, textAlign: 'center',
            animation: `htpFadeUp 0.5s ease ${0.3 + i * 0.15}s both`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{layer.icon}</div>
            <div style={{ fontFamily: T.fontHeadline, fontSize: 16, fontWeight: 700, color: layer.color }}>{layer.name}</div>
            <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.textMuted, marginTop: 4 }}>{layer.desc}</div>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textMuted, marginTop: 24, maxWidth: 440, ...stagger(4) }}>
        You need all three layers to meet the threshold — neglect one and the park suffers.
      </p>
    </div>
  );

  const renderPhases = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 32px' }}>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 24, textAlign: 'center', ...stagger(0) }}>
        Each round flows through 5 phases
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520, width: '100%' }}>
        {PHASES.map((p, i) => (
          <div key={p.num} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
            borderRadius: 14, background: T.container, border: `1px solid ${p.color}33`,
            animation: `htpFadeUp 0.45s ease ${0.15 + i * 0.1}s both`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: p.color + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              border: `2px solid ${p.color}66`, flexShrink: 0,
            }}>
              {p.icon}
            </div>
            <div>
              <div style={{ fontFamily: T.fontHeadline, fontSize: 15, fontWeight: 700, color: p.color }}>
                <span style={{ fontFamily: T.fontNumber, marginRight: 6, opacity: 0.6 }}>{p.num}.</span>
                {p.name}
              </div>
              <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.textMuted }}>{p.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderInvestigation = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16, animation: 'htpPulse 2s ease-in-out infinite' }}>{'\u{1F50D}'}</div>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: '#7BA05B', marginBottom: 12, ...stagger(0) }}>
        Hidden Object Investigation
      </h2>
      <p style={{ fontFamily: T.fontBody, fontSize: 16, color: T.text, maxWidth: 500, lineHeight: 1.6, marginBottom: 24, ...stagger(1) }}>
        Explore the zone scene and click on objects to discover clues. Some are relevant to your challenge — some are traps!
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', ...stagger(2) }}>
        {[
          { icon: '\u{2705}', label: 'Relevant clues', sub: 'Worth investigation points' },
          { icon: '\u{26A0}\uFE0F', label: 'Trap objects', sub: 'Cost you time' },
          { icon: '\u{1F4A1}', label: 'Hints available', sub: 'Use 3 per round' },
        ].map(item => (
          <div key={item.label} style={{
            padding: '14px 18px', borderRadius: 12, background: T.container,
            border: `1px solid rgba(123, 160, 91, 0.25)`, textAlign: 'center', width: 150,
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontFamily: T.fontHeadline, fontSize: 13, fontWeight: 600, color: T.text }}>{item.label}</div>
            <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.textMuted }}>{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 32px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 26, fontWeight: 700, color: T.secondary, marginBottom: 8, ...stagger(0) }}>
        Build Tasks from Cards
      </h2>
      <p style={{ fontFamily: T.fontBody, fontSize: 15, color: T.textMuted, maxWidth: 480, marginBottom: 24, ...stagger(1) }}>
        Each task is assembled from 4 card types — like building a sentence of action.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
        {[
          { type: 'Action', color: '#e74c3c', example: 'Install, Plant, Design...', icon: '\u{26A1}' },
          { type: 'Method', color: '#3498db', example: 'Workshop, Survey, DIY...', icon: '\u{1F527}' },
          { type: 'Who', color: '#2ecc71', example: 'Youth, Vendors, Elders...', icon: '\u{1F465}' },
          { type: 'Outcome', color: '#f39c12', example: 'Safety, Access, Beauty...', icon: '\u{1F3AF}' },
        ].map((card, i) => (
          <div key={card.type} style={{
            width: 130, padding: '18px 12px', borderRadius: 14, background: T.container,
            border: `2px solid ${card.color}55`, textAlign: 'center',
            animation: `htpFadeUp 0.5s ease ${0.25 + i * 0.12}s both`,
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{card.icon}</div>
            <div style={{ fontFamily: T.fontHeadline, fontSize: 15, fontWeight: 700, color: card.color }}>{card.type}</div>
            <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.textMuted, marginTop: 4, fontStyle: 'italic' }}>{card.example}</div>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textMuted, marginTop: 20, maxWidth: 440, ...stagger(5) }}>
        Add a local insight to ground your task in the real park context.
      </p>
    </div>
  );

  const renderMultiplier = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: T.primary, marginBottom: 8, ...stagger(0) }}>
        Collaboration is Power
      </h2>
      <p style={{ fontFamily: T.fontBody, fontSize: 16, color: T.textMuted, maxWidth: 480, marginBottom: 28, ...stagger(1) }}>
        The more different roles contribute to a series, the higher the multiplier.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'center', ...stagger(2) }}>
        {COMBOS.map((c, i) => {
          const height = 40 + i * 28;
          return (
            <div key={c.roles} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              animation: `htpFadeUp 0.5s ease ${0.2 + i * 0.1}s both`,
            }}>
              <div style={{ fontFamily: T.fontNumber, fontSize: 18, fontWeight: 700, color: T.primary, animation: i === 4 ? 'htpGlow 2s ease-in-out infinite' : 'none', padding: '4px 10px', borderRadius: 8, background: i === 4 ? T.primary + '22' : 'transparent' }}>
                {c.mult}
              </div>
              <div style={{
                width: 48, height, borderRadius: '8px 8px 0 0',
                background: `linear-gradient(to top, ${T.primary}44, ${T.primary}${(20 + i * 18).toString(16).padStart(2, '0')})`,
                border: `1px solid ${T.primary}44`,
              }} />
              <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.textMuted }}>
                {c.roles} role{c.roles > 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 28, padding: '12px 24px', borderRadius: 12, background: T.container, border: `1px solid ${T.primary}33`, ...stagger(3) }}>
        <span style={{ fontFamily: T.fontBody, fontSize: 14, color: T.text }}>
          Chain bonus: assess {'\u2192'} plan {'\u2192'} design {'\u2192'} build {'\u2192'} maintain = <span style={{ color: T.primary, fontWeight: 700 }}>+18 pts</span>
        </span>
      </div>
    </div>
  );

  const renderGuardian = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16, animation: 'htpFloat 4s ease-in-out infinite' }}>{'\u{1F333}'}</div>
      <h2 style={{ fontFamily: T.fontHeadline, fontSize: 28, fontWeight: 700, color: T.activation, marginBottom: 12, ...stagger(0) }}>
        Park Guardian Speaks
      </h2>
      <p style={{ fontFamily: T.fontBody, fontSize: 16, color: T.text, maxWidth: 500, lineHeight: 1.6, marginBottom: 24, ...stagger(1) }}>
        At the end of each round, the Park Guardian evaluates your collective plan against a hidden threshold.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', ...stagger(2) }}>
        {[
          { label: 'Placemaking layers', desc: 'All three must be balanced' },
          { label: 'Difficulty factor', desc: 'Harder zones need more' },
          { label: 'Collaboration', desc: 'Working together lowers the bar' },
        ].map(item => (
          <div key={item.label} style={{
            padding: '14px 18px', borderRadius: 12, background: T.container,
            border: `1px solid ${T.activation}33`, width: 170, textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.fontHeadline, fontSize: 13, fontWeight: 600, color: T.activation }}>{item.label}</div>
            <div style={{ fontFamily: T.fontBody, fontSize: 11, color: T.textMuted, marginTop: 4 }}>{item.desc}</div>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: T.fontBody, fontSize: 13, color: T.textMuted, marginTop: 20, maxWidth: 440, fontStyle: 'italic', ...stagger(3) }}>
        Near miss? You'll get progressive hints — not answers — to nudge you closer.
      </p>
    </div>
  );

  const renderRemember = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 40px', textAlign: 'center' }}>
      <div style={{
        fontSize: 72, marginBottom: 20,
        animation: 'htpPulse 3s ease-in-out infinite',
      }}>{'\u{1F331}'}</div>
      <h2 style={{
        fontFamily: T.fontHeadline, fontSize: 36, fontWeight: 800, color: T.primary, marginBottom: 16,
        ...stagger(0),
      }}>
        Remember
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520, ...stagger(1) }}>
        {[
          'This is not a competition — it\'s a conversation about place.',
          'Every role sees something others miss.',
          'The best plans emerge when everyone contributes.',
          'The park reflects what you choose to prioritize together.',
        ].map((line, i) => (
          <p key={i} style={{
            fontFamily: T.fontBody, fontSize: 17, color: T.text, lineHeight: 1.5,
            padding: '10px 20px', borderRadius: 10, background: T.container,
            borderLeft: `3px solid ${T.primary}66`,
            animation: `htpFadeUp 0.5s ease ${0.3 + i * 0.12}s both`,
          }}>
            {line}
          </p>
        ))}
      </div>
      <button
        onClick={onClose}
        style={{
          marginTop: 32, padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
          fontFamily: T.fontHeadline, fontSize: 18, fontWeight: 700, color: T.surface,
          background: `linear-gradient(135deg, ${T.primary}, ${T.tertiary})`,
          animation: 'htpGlow 2s ease-in-out infinite, htpFadeUp 0.5s ease 0.8s both',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Let's Play {'\u2192'}
      </button>
    </div>
  );

  const RENDERERS = [
    renderWelcome, renderStory, renderRoles, renderResources, renderPhases,
    renderInvestigation, renderCards, renderMultiplier, renderGuardian, renderRemember,
  ];

  const slideVariants = {
    enter: (dir: number) => ({ x: dir >= 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir >= 0 ? -300 : 300, opacity: 0, scale: 0.95 }),
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: T.surface,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Cinematic letterbox top */}
      <div style={{ height: 36, background: '#000', flexShrink: 0 }} />

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 24px', background: T.container, borderBottom: `1px solid ${T.primary}22`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: T.fontNumber, fontSize: 13, color: T.textMuted }}>
            {current + 1} / {SLIDES.length}
          </span>
          <span style={{ fontFamily: T.fontHeadline, fontSize: 15, fontWeight: 600, color: slide.accent }}>
            {slide.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Pause/play */}
          <button
            onClick={() => setPaused(!paused)}
            style={{
              background: 'none', border: `1px solid ${T.textMuted}`, borderRadius: 8,
              padding: '4px 10px', cursor: 'pointer', color: T.textMuted,
              fontFamily: T.fontBody, fontSize: 12,
            }}
          >
            {paused ? '\u25B6 Play' : '\u23F8 Pause'}
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: T.textMuted, padding: '4px 8px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.textMuted)}
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: T.container, flexShrink: 0, position: 'relative' }}>
        <motion.div
          style={{ height: '100%', background: `linear-gradient(90deg, ${slide.accent}, ${T.primary})`, borderRadius: '0 2px 2px 0' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            style={{ position: 'absolute', inset: 0, overflow: 'auto' }}
          >
            {RENDERERS[current]()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', background: T.container, borderTop: `1px solid ${T.primary}22`,
        flexShrink: 0,
      }}>
        {/* Back */}
        <button
          onClick={goBack}
          disabled={current === 0}
          style={{
            background: 'none', border: 'none', cursor: current === 0 ? 'default' : 'pointer',
            fontFamily: T.fontBody, fontSize: 14, fontWeight: 600,
            color: current === 0 ? T.textMuted + '44' : T.text,
            padding: '8px 16px', borderRadius: 10, transition: 'opacity 0.2s',
          }}
        >
          {'\u2190'} Back
        </button>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => goTo(idx)}
              style={{
                width: idx === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: idx === current ? s.accent : idx < current ? T.textMuted : T.textMuted + '44',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={current === SLIDES.length - 1 ? onClose : goNext}
          style={{
            background: current === SLIDES.length - 1
              ? `linear-gradient(135deg, ${T.primary}, ${T.tertiary})`
              : slide.accent + '22',
            border: current === SLIDES.length - 1 ? 'none' : `1px solid ${slide.accent}55`,
            cursor: 'pointer',
            fontFamily: T.fontHeadline, fontSize: 14, fontWeight: 700,
            color: current === SLIDES.length - 1 ? T.surface : slide.accent,
            padding: '8px 20px', borderRadius: 10, transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {current === SLIDES.length - 1 ? 'Start Playing \u2192' : 'Next \u2192'}
        </button>
      </div>

      {/* Cinematic letterbox bottom */}
      <div style={{ height: 36, background: '#000', flexShrink: 0 }} />

      {/* Keyboard hint */}
      <div style={{
        position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
        fontFamily: T.fontBody, fontSize: 11, color: T.textMuted + '66',
        pointerEvents: 'none',
      }}>
        {'\u2190'} {'\u2192'} arrow keys &bull; Space to advance &bull; Esc to close
      </div>
    </div>
  );
}
