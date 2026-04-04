import React, { useState, useMemo, useCallback } from 'react';

export interface SessionStartConfig {
  sessionNumber: number;
  challengeSetId: string;
  playNumber: number;
  players: { name: string; roleId: string }[];
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

const ROLES = [
  { id: 'administrator', name: 'Administrator', hint: 'Budget authority, institutional decisions', color: '#e04838' },
  { id: 'designer', name: 'Designer', hint: 'Technical knowledge, specifications', color: '#5d8ac4' },
  { id: 'advocate', name: 'Advocate', hint: 'Legal leverage, institutional bridges', color: '#a088c4' },
  { id: 'citizen', name: 'Citizen', hint: 'Community voice, local knowledge', color: '#aed456' },
  { id: 'investor', name: 'Investor', hint: 'Market connections, revenue models', color: '#e9c349' },
];

const PLAY_COUNT_KEY = 'commonground_play_counts';
function getPlayCounts(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(PLAY_COUNT_KEY) || '{}'); } catch { return {}; }
}

function diffDots(level: number, max = 5) {
  let s = '';
  for (let i = 0; i < max; i++) s += i < level ? '\u25CF' : '\u25CB';
  return s;
}

export default function SessionDashboard({ onStartSession }: Props) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState(['', '', '', '', '']);
  const [playerRoles, setPlayerRoles] = useState(['administrator', 'designer', 'advocate', 'citizen', 'investor']);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const playCounts = useMemo(() => getPlayCounts(), []);

  const totalPlays = useMemo(() => SESSIONS.reduce((s, ses) => s + (playCounts[ses.id] || 0), 0), [playCounts]);
  const selectedData = useMemo(() => SESSIONS.find(s => s.id === selectedSession), [selectedSession]);
  const sessionNumber = selectedData ? SESSIONS.indexOf(selectedData) + 1 : 0;
  const currentPlayCount = selectedSession ? (playCounts[selectedSession] || 0) : 0;

  const usedRoles = useMemo(() => {
    const m = new Map<number, string>();
    playerRoles.forEach((r, i) => m.set(i, r));
    return m;
  }, [playerRoles]);

  const hasDuplicateRoles = useMemo(() => {
    const seen = new Set<string>();
    for (const r of playerRoles) { if (seen.has(r)) return true; seen.add(r); }
    return false;
  }, [playerRoles]);

  const canStart = selectedSession && playerNames.every(n => n.trim() !== '') && !hasDuplicateRoles;

  const setName = useCallback((i: number, v: string) => {
    setPlayerNames(prev => { const n = [...prev]; n[i] = v; return n; });
  }, []);

  const setRole = useCallback((i: number, v: string) => {
    setPlayerRoles(prev => { const n = [...prev]; n[i] = v; return n; });
  }, []);

  const handleStart = useCallback(() => {
    if (!selectedData || !canStart) return;
    const config: SessionStartConfig = {
      sessionNumber,
      challengeSetId: selectedData.setId,
      playNumber: currentPlayCount + 1,
      players: playerNames.map((name, i) => ({ name: name.trim(), roleId: playerRoles[i] })),
    };
    console.log('[SessionDashboard] Starting session:', config);
    onStartSession(config);
  }, [selectedData, canStart, sessionNumber, currentPlayCount, playerNames, playerRoles, onStartSession]);

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

      {/* Total Plays Bar */}
      <div style={{ marginTop: 20, width: '100%', maxWidth: 500, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: T.onSurfaceVariant, marginBottom: 6 }}>
          Total sessions played: {totalPlays} / 30 target
        </div>
        <div style={{ height: 8, borderRadius: 4, background: T.containerHigh, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: T.primary, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Player Setup */}
      {selectedData && (
        <div style={{ marginTop: 32, width: '100%', maxWidth: 600, background: T.containerLow, borderRadius: 12, padding: '24px 28px', border: `1px solid ${T.outlineVariant}` }}>
          <h2 style={{ fontFamily: T.fontHeadline, fontSize: 20, margin: '0 0 4px', color: T.onSurface }}>
            Session {sessionNumber} — Player Setup
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: T.tertiary, fontFamily: T.fontNumber }}>
            Play #{currentPlayCount + 1}
          </p>
          {playerNames.map((name, i) => {
            const role = ROLES.find(r => r.id === playerRoles[i]);
            const otherUsed = new Set(playerRoles.filter((_, j) => j !== i));
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: T.fontNumber, fontSize: 14, color: T.onSurfaceVariant, width: 28, flexShrink: 0 }}>P{i + 1}</span>
                  <input value={name} onChange={e => setName(i, e.target.value)} placeholder="Player name"
                    style={{
                      width: 200, padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                      background: T.container, color: T.onSurface, fontFamily: T.fontBody, fontSize: 14, outline: 'none',
                    }} />
                  <select value={playerRoles[i]} onChange={e => setRole(i, e.target.value)}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.outlineVariant}`,
                      background: T.container, color: T.onSurface, fontFamily: T.fontBody, fontSize: 14, outline: 'none',
                    }}>
                    {ROLES.map(r => (
                      <option key={r.id} value={r.id} disabled={otherUsed.has(r.id)}>{r.name}</option>
                    ))}
                  </select>
                </div>
                {role && (
                  <div style={{ marginLeft: 38, marginTop: 3, fontSize: 11, color: role.color, opacity: 0.8 }}>
                    {role.hint}
                  </div>
                )}
              </div>
            );
          })}
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
