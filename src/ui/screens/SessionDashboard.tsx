import React, { useState, useMemo, useCallback } from 'react';

export interface SessionStartConfig {
  sessionNumber: number;
  challengeSetId: string;
  playNumber: number;
  players: { name: string }[];
  isPilot?: boolean;
  pilotZoneId?: string;
}

interface Props {
  onStartSession: (config: SessionStartConfig) => void;
}

const T = {
  primary: '#aed456', secondary: '#f4bb92', tertiary: '#e9c349',
  surface: '#16130c', container: '#221f18', containerLow: '#1e1b14',
  containerHigh: '#2d2a22', onSurface: '#e9e2d5', onSurfaceVariant: '#c6c8b8',
  outlineVariant: '#45483c', fontHeadline: 'Epilogue, sans-serif',
  fontBody: 'Manrope, sans-serif', fontNumber: 'Georgia, serif',
};

const SESSIONS = [
  { id: 'session1', setId: 'setA', label: 'Session 1', rounds: [
    { zone: 'Walking Track', zoneId: 'z5', diff: 2 },
    { zone: 'Boating Pond', zoneId: 'z3', diff: 3 },
    { zone: 'Playground', zoneId: 'z6', diff: 3 },
  ]},
  { id: 'session2', setId: 'setB', label: 'Session 2', rounds: [
    { zone: 'Herbal Garden', zoneId: 'z4', diff: 2 },
    { zone: 'Fountain Plaza', zoneId: 'z2', diff: 3 },
    { zone: 'Main Entrance', zoneId: 'z1', diff: 4 },
  ]},
  { id: 'session3', setId: 'setC', label: 'Session 3', rounds: [
    { zone: 'Open Lawn', zoneId: 'z7', diff: 2 },
    { zone: 'Nursery Area', zoneId: 'z8', diff: 3 },
    { zone: 'PPP Zone', zoneId: 'z13', diff: 4 },
  ]},
  { id: 'session4', setId: 'setD', label: 'Session 4', rounds: [
    { zone: 'Staff Quarters', zoneId: 'z9', diff: 2 },
    { zone: 'Peripheral Walk', zoneId: 'z10', diff: 3 },
    { zone: 'South Pond', zoneId: 'z11', diff: 3 },
  ]},
  { id: 'session5', setId: 'setE', label: 'Session 5', rounds: [
    { zone: 'Compost Area', zoneId: 'z12', diff: 2 },
    { zone: 'Water Tank', zoneId: 'z14', diff: 3 },
    { zone: 'Walking Track', zoneId: 'z5', diff: 3 },
  ]},
];

const ZONES = [
  { id: 'z1', name: 'Z1 Main Entrance' }, { id: 'z2', name: 'Z2 Fountain Plaza' },
  { id: 'z3', name: 'Z3 Boating Pond' }, { id: 'z4', name: 'Z4 Herbal Garden' },
  { id: 'z5', name: 'Z5 Walking Track' }, { id: 'z6', name: 'Z6 Playground' },
  { id: 'z7', name: 'Z7 Open Lawn' }, { id: 'z8', name: 'Z8 Nursery Area' },
  { id: 'z9', name: 'Z9 Staff Quarters' }, { id: 'z10', name: 'Z10 Peripheral Walk' },
  { id: 'z11', name: 'Z11 South Pond' }, { id: 'z12', name: 'Z12 Compost Area' },
  { id: 'z13', name: 'Z13 PPP Zone' }, { id: 'z14', name: 'Z14 Water Tank & Pump House' },
];

const PLAY_COUNT_KEY = 'commonground_play_counts';
const PILOT_COUNT_KEY = 'cg_pilot_count';
function getPlayCounts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PLAY_COUNT_KEY) || '{}'); } catch { return {}; }
}
function getPilotCount(): number {
  try { return parseInt(localStorage.getItem(PILOT_COUNT_KEY) || '0', 10); } catch { return 0; }
}

function diffDots(level: number, max = 5) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < level ? '\u25CF' : '\u25CB';
  return s;
}

export default function SessionDashboard({ onStartSession }: Props) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState(['', '', '', '', '']);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showPilotSetup, setShowPilotSetup] = useState(false);
  const [pilotZone, setPilotZone] = useState('z3');
  const [pilotNames, setPilotNames] = useState(['', '', '', '', '']);
  const playCounts = useMemo(() => getPlayCounts(), []);
  const pilotCount = useMemo(() => getPilotCount(), []);

  const totalPlays = useMemo(() => SESSIONS.reduce((s, ses) => s + (playCounts[ses.id] || 0), 0), [playCounts]);
  const selectedData = useMemo(() => SESSIONS.find(s => s.id === selectedSession), [selectedSession]);
  const sessionNumber = selectedData ? SESSIONS.indexOf(selectedData) + 1 : 0;
  const currentPlayCount = selectedSession ? (playCounts[selectedSession] || 0) : 0;

  const canStart = selectedSession && playerNames.every(n => n.trim() !== '');

  const setName = useCallback((i: number, v: string) => {
    setPlayerNames(prev => { const n = [...prev]; n[i] = v; return n; });
  }, []);

  const handleStart = useCallback(() => {
    if (!selectedData || !canStart) return;
    const config: SessionStartConfig = {
      sessionNumber,
      challengeSetId: selectedData.setId,
      playNumber: currentPlayCount + 1,
      players: playerNames.map(name => ({ name: name.trim() })),
    };
    console.log('[SessionDashboard] Starting session:', config);
    onStartSession(config);
  }, [selectedData, canStart, sessionNumber, currentPlayCount, playerNames, onStartSession]);

  const canStartPilot = pilotNames.every(n => n.trim() !== '') && pilotZone;
  const handlePilotStart = useCallback(() => {
    if (!canStartPilot) return;
    const config: SessionStartConfig = {
      sessionNumber: 0,
      challengeSetId: 'pilot',
      playNumber: pilotCount + 1,
      players: pilotNames.map(name => ({ name: name.trim() })),
      isPilot: true,
      pilotZoneId: pilotZone,
    };
    console.log('[SessionDashboard] Starting pilot:', config);
    onStartSession(config);
  }, [canStartPilot, pilotNames, pilotZone, pilotCount, onStartSession]);

  const setPilotName = useCallback((i: number, v: string) => {
    setPilotNames(prev => { const n = [...prev]; n[i] = v; return n; });
  }, []);

  const progressPct = Math.min((totalPlays / 30) * 100, 100);

  return (
    <div style={{ minHeight: '100vh', background: T.surface, color: T.onSurface, fontFamily: T.fontBody, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      {/* Header */}
      <h1 style={{ fontFamily: T.fontHeadline, fontSize: 36, margin: 0, color: T.primary, letterSpacing: 1 }}>CommonGround</h1>
      <p style={{ margin: '4px 0 0', fontSize: 15, color: T.onSurfaceVariant }}>Collaborative Placemaking Game</p>
      <p style={{ margin: '2px 0 24px', fontSize: 13, color: T.outlineVariant }}>Corporation Eco-Park, Madurai</p>

      {/* Session Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 1020 }}>
        {SESSIONS.map(ses => {
          const count = playCounts[ses.id] || 0;
          const isSel = selectedSession === ses.id;
          const isHov = hoveredCard === ses.id;
          return (
            <div key={ses.id} onClick={() => setSelectedSession(ses.id)}
              onMouseEnter={() => setHoveredCard(ses.id)} onMouseLeave={() => setHoveredCard(null)}
              style={{
                width: 190, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                background: isSel ? 'rgba(174,212,86,0.05)' : T.container,
                border: `2px solid ${isSel ? T.primary : T.outlineVariant}`,
                transform: isHov ? 'translateY(-2px)' : 'none',
                transition: 'transform 0.15s, border-color 0.15s, background 0.15s',
              }}>
              <div style={{ fontFamily: T.fontHeadline, fontSize: 16, marginBottom: 10 }}>{ses.label}</div>
              {ses.rounds.map((r, ri) => (
                <div key={ri} style={{ fontSize: 12, color: T.onSurfaceVariant, marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Rd {ri + 1}: {r.zone}</span>
                  <span style={{ letterSpacing: 2 }}>
                    {diffDots(r.diff).split('').map((c, ci) => (
                      <span key={ci} style={{ color: c === '\u25CF' ? T.tertiary : T.outlineVariant, fontSize: 10 }}>{c}</span>
                    ))}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 12, fontFamily: T.fontNumber, color: count > 0 ? T.primary : T.outlineVariant }}>
                Played: {count} time{count !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom: Pilot Test + Formal Sessions side by side */}
      <div style={{
        marginTop: 24, width: '100%', maxWidth: 700, display: 'flex', gap: 16,
        background: T.containerLow, borderRadius: 8, padding: '16px 24px',
      }}>
        {/* Left: Pilot Testing */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>PILOT TESTING</div>
          <button onClick={() => { setShowPilotSetup(!showPilotSetup); setSelectedSession(null); }}
            style={{
              padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
              background: `${T.tertiary}15`, border: `1px solid ${T.tertiary}40`,
              color: T.tertiary, fontFamily: T.fontBody, fontSize: 12,
            }}>
            {showPilotSetup ? 'Hide Pilot Setup' : 'Start Pilot Test'}
          </button>
          <div style={{ marginTop: 6, fontSize: 11, color: T.onSurfaceVariant }}>Pilots: {pilotCount} completed</div>
          <div style={{ fontSize: 10, color: T.outlineVariant }}>Target: 10-15 before formal collection</div>
        </div>
        {/* Right: Formal Data Collection */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.fontBody, fontSize: 12, fontWeight: 700, color: T.onSurface, marginBottom: 8 }}>FORMAL DATA COLLECTION</div>
          <div style={{ height: 6, borderRadius: 3, background: T.outlineVariant, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: T.primary, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: T.onSurfaceVariant }}>{totalPlays} of 30 target sessions completed</div>
        </div>
      </div>

      {/* Pilot Setup */}
      {showPilotSetup && (
        <div style={{ marginTop: 20, width: '100%', maxWidth: 600, background: T.containerLow, borderRadius: 12, padding: '24px 28px', border: `1px solid ${T.tertiary}30` }}>
          <h2 style={{ fontFamily: T.fontHeadline, fontSize: 18, margin: '0 0 4px', color: T.tertiary }}>Pilot Test Setup</h2>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: T.onSurfaceVariant }}>Single zone, 1 round only — for testing and calibration</p>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.onSurfaceVariant, marginBottom: 4 }}>SELECT ZONE FOR PILOT:</div>
            <select value={pilotZone} onChange={e => setPilotZone(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                background: T.container, color: T.onSurface, fontFamily: T.fontBody, fontSize: 14, outline: 'none',
              }}>
              {ZONES.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          {pilotNames.map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: T.fontNumber, fontSize: 14, color: T.onSurfaceVariant, width: 28, flexShrink: 0 }}>P{i + 1}</span>
              <input value={name} onChange={e => setPilotName(i, e.target.value)} placeholder="Player name"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                  background: T.container, color: T.onSurface, fontFamily: T.fontBody, fontSize: 14, outline: 'none',
                }} />
            </div>
          ))}
          <button onClick={handlePilotStart} disabled={!canStartPilot}
            style={{
              marginTop: 8, width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
              cursor: canStartPilot ? 'pointer' : 'not-allowed',
              background: canStartPilot ? T.tertiary : T.containerHigh,
              color: canStartPilot ? T.surface : T.outlineVariant,
              fontFamily: T.fontHeadline, fontSize: 15, fontWeight: 600, opacity: canStartPilot ? 1 : 0.5,
            }}>
            Start Pilot {'\u2192'}
          </button>
        </div>
      )}

      {/* Player Setup (formal session) */}
      {selectedData && !showPilotSetup && (
        <div style={{ marginTop: 32, width: '100%', maxWidth: 600, background: T.containerLow, borderRadius: 12, padding: '24px 28px', border: `1px solid ${T.outlineVariant}` }}>
          <h2 style={{ fontFamily: T.fontHeadline, fontSize: 20, margin: '0 0 4px', color: T.onSurface }}>
            Session {sessionNumber} — Player Setup
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: T.tertiary, fontFamily: T.fontNumber }}>
            Play #{currentPlayCount + 1}
          </p>
          {playerNames.map((name, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.fontNumber, fontSize: 14, color: T.onSurfaceVariant, width: 28, flexShrink: 0 }}>P{i + 1}</span>
              <input value={name} onChange={e => setName(i, e.target.value)} placeholder="Player name"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                  background: T.container, color: T.onSurface, fontFamily: T.fontBody, fontSize: 14, outline: 'none',
                }} />
            </div>
          ))}
          <button onClick={handleStart} disabled={!canStart}
            style={{
              marginTop: 10, width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', cursor: canStart ? 'pointer' : 'not-allowed',
              background: canStart ? T.primary : T.containerHigh, color: canStart ? T.surface : T.outlineVariant,
              fontFamily: T.fontHeadline, fontSize: 16, fontWeight: 600, transition: 'background 0.2s',
              opacity: canStart ? 1 : 0.5,
            }}>
            Start Session →
          </button>
        </div>
      )}
    </div>
  );
}
