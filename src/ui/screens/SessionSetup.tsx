import React, { useState, useMemo } from 'react';

export interface SessionConfig {
  sessionNumber: number;
  challengeSetId: string;
  players: { name: string; roleId: string }[];
}

const T = {
  primary: '#aed456', secondary: '#f4bb92', tertiary: '#e9c349',
  surface: '#16130c', container: '#221f18', containerHigh: '#2d2a22',
  onSurface: '#e9e2d5', onSurfaceVariant: '#c6c8b8', outlineVariant: '#45483c',
  fontHeadline: 'Epilogue, sans-serif', fontBody: 'Manrope, sans-serif',
};

const SETS = [
  { id: 'setA', name: 'Set A', desc: 'Infrastructure focus', rounds: [
    { zone: 'Z5 Walking Track', diff: 2 }, { zone: 'Z3 Boating Pond', diff: 3 }, { zone: 'Z6 Playground', diff: 3 }
  ]},
  { id: 'setB', name: 'Set B', desc: 'Mixed challenges', rounds: [
    { zone: 'Z4 Herbal Garden', diff: 2 }, { zone: 'Z2 Fountain Plaza', diff: 3 }, { zone: 'Z1 Main Entrance', diff: 4 }
  ]},
  { id: 'setC', name: 'Set C', desc: 'Community challenges', rounds: [
    { zone: 'Z7 Open Lawn', diff: 2 }, { zone: 'Z8 Nursery Area', diff: 3 }, { zone: 'Z13 PPP Zone', diff: 4 }
  ]},
  { id: 'setD', name: 'Set D', desc: 'Institutional focus', rounds: [
    { zone: 'Z9 Staff Quarters', diff: 2 }, { zone: 'Z10 Peripheral Walk', diff: 3 }, { zone: 'Z11 South Pond', diff: 3 }
  ]},
  { id: 'setE', name: 'Set E', desc: 'Ecology & infra', rounds: [
    { zone: 'Z12 Compost Area', diff: 2 }, { zone: 'Z14 Water Tank', diff: 3 }, { zone: 'Z5 Walking Track', diff: 3 }
  ]},
];

const ROLES = [
  { id: 'administrator', name: 'Administrator', desc: 'Budget & institutional authority', color: '#e04838' },
  { id: 'designer', name: 'Designer', desc: 'Technical knowledge & specifications', color: '#5d8ac4' },
  { id: 'advocate', name: 'Advocate', desc: 'Legal leverage & institutional bridges', color: '#a088c4' },
  { id: 'citizen', name: 'Citizen', desc: 'Community voice & local knowledge', color: '#aed456' },
  { id: 'investor', name: 'Investor', desc: 'Market connections & revenue planning', color: '#e9c349' },
];

const dots = (filled: number, max = 5) =>
  Array.from({ length: max }, (_, i) => (i < filled ? '\u25CF' : '\u25CB')).join(' ');

export default function SessionSetup({ onStart }: { onStart: (config: SessionConfig) => void }) {
  const [sessionNum, setSessionNum] = useState(1);
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState(['', '', '', '', '']);
  const [playerRoles, setPlayerRoles] = useState(['administrator', 'designer', 'advocate', 'citizen', 'investor']);

  const recommendedSet = useMemo(() => {
    const idx = Math.min(Math.floor((sessionNum - 1) / 6), SETS.length - 1);
    return SETS[idx].id;
  }, [sessionNum]);

  const duplicateRoles = useMemo(() => {
    const seen = new Map<string, number[]>();
    playerRoles.forEach((r, i) => { seen.set(r, [...(seen.get(r) || []), i]); });
    const dupes = new Set<number>();
    seen.forEach((indices) => { if (indices.length > 1) indices.forEach((i) => dupes.add(i)); });
    return dupes;
  }, [playerRoles]);

  const canStart = selectedSet !== null && playerNames.every((n) => n.trim() !== '') && duplicateRoles.size === 0;

  const handleStart = () => {
    if (!canStart || !selectedSet) return;
    const config: SessionConfig = {
      sessionNumber: sessionNum,
      challengeSetId: selectedSet,
      players: playerNames.map((name, i) => ({ name: name.trim(), roleId: playerRoles[i] })),
    };
    console.log('SESSION_START:', config);
    onStart(config);
  };

  const setName = (idx: number, val: string) => {
    const next = [...playerNames]; next[idx] = val; setPlayerNames(next);
  };
  const setRole = (idx: number, val: string) => {
    const next = [...playerRoles]; next[idx] = val; setPlayerRoles(next);
  };

  const usedRoles = (excludeIdx: number) =>
    playerRoles.filter((_, i) => i !== excludeIdx);

  const sectionLabel = (text: string): React.CSSProperties => ({
    fontFamily: T.fontHeadline, fontSize: 18, color: T.onSurface, marginBottom: 8,
  });

  return (
    <div style={{ minHeight: '100vh', background: T.surface, display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 640, padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontHeadline, fontSize: 32, color: T.primary }}>CommonGround</div>
          <div style={{ fontFamily: T.fontBody, fontSize: 14, color: T.onSurfaceVariant, marginTop: 4 }}>Collaborative Placemaking Game</div>
        </div>

        {/* Section 1 — Session Number */}
        <div>
          <div style={sectionLabel('s')}>Session Number</div>
          <input type="number" min={1} value={sessionNum} onChange={(e) => setSessionNum(Math.max(1, Number(e.target.value)))}
            style={{ width: 80, padding: '8px 12px', background: T.containerHigh, border: `1px solid ${T.outlineVariant}`,
              borderRadius: 6, color: T.onSurface, fontFamily: T.fontBody, fontSize: 16, outline: 'none' }} />
        </div>

        {/* Section 2 — Challenge Set */}
        <div>
          <div style={sectionLabel('s')}>Challenge Set</div>
          <div style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurfaceVariant, marginBottom: 12 }}>
            Recommended for session {sessionNum}: <span style={{ color: T.tertiary }}>{SETS.find((s) => s.id === recommendedSet)?.name}</span>
            {' '}(Sessions 1-6: Set A, 7-12: Set B, etc.)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SETS.map((set) => (
              <div key={set.id} onClick={() => setSelectedSet(set.id)}
                style={{ padding: '12px 16px', background: T.container, borderRadius: 8, cursor: 'pointer',
                  borderLeft: selectedSet === set.id ? `4px solid ${T.primary}` : '4px solid transparent',
                  transition: 'border-color 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: T.fontHeadline, fontSize: 14, color: T.onSurface }}>{set.name}</span>
                  <span style={{ fontFamily: T.fontBody, fontSize: 12, color: T.onSurfaceVariant }}>{set.desc}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  {set.rounds.map((r, i) => (
                    <div key={i} style={{ fontFamily: T.fontBody, fontSize: 11, color: T.onSurfaceVariant }}>
                      R{i + 1}: {r.zone} <span style={{ color: T.tertiary, letterSpacing: 2 }}>{dots(r.diff)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Players */}
        <div>
          <div style={sectionLabel('s')}>Players</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {playerNames.map((name, i) => {
              const taken = usedRoles(i);
              const isDup = duplicateRoles.has(i);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: T.fontBody, fontSize: 13, color: T.onSurfaceVariant, width: 60, flexShrink: 0 }}>Player {i + 1}</span>
                  <input type="text" placeholder="Name" value={name} onChange={(e) => setName(i, e.target.value)}
                    style={{ flex: 1, minWidth: 120, padding: '8px 12px', background: T.containerHigh,
                      border: `1px solid ${T.outlineVariant}`, borderRadius: 6, color: T.onSurface,
                      fontFamily: T.fontBody, fontSize: 14, outline: 'none' }} />
                  <select value={playerRoles[i]} onChange={(e) => setRole(i, e.target.value)}
                    style={{ padding: '8px 12px', background: T.containerHigh, border: `1px solid ${isDup ? '#e04838' : T.outlineVariant}`,
                      borderRadius: 6, color: ROLES.find((r) => r.id === playerRoles[i])?.color || T.onSurface,
                      fontFamily: T.fontBody, fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                    {ROLES.map((role) => {
                      const usedByOther = taken.includes(role.id);
                      return <option key={role.id} value={role.id}>{role.name}{usedByOther ? ' (taken)' : ''}</option>;
                    })}
                  </select>
                  {isDup && <span style={{ fontFamily: T.fontBody, fontSize: 11, color: '#e04838', width: '100%' }}>Duplicate role — each role must be unique</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4 — Start */}
        <button onClick={handleStart} disabled={!canStart}
          style={{ width: '100%', padding: '14px 0', background: canStart ? T.primary : T.outlineVariant,
            color: canStart ? T.surface : T.onSurfaceVariant, border: 'none', borderRadius: 8,
            fontFamily: T.fontHeadline, fontSize: 16, cursor: canStart ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s', marginBottom: 32 }}>
          Start Session
        </button>
      </div>
    </div>
  );
}
