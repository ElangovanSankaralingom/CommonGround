import React, { useState } from 'react';

export interface RoundResult {
  roundNumber: number;
  zoneName: string;
  transformationPercent: number;
  seriesName: string;
  seriesPoints: number;
  chainStatus: string;
}

export interface PlayerScore {
  name: string;
  roleId: string;
  totalPoints: number;
  rewardLevel: 'library' | 'metro' | 'certificate' | 'premium';
  breakdown: { label: string; points: number }[];
}

interface Props {
  sessionNumber: number;
  rounds: RoundResult[];
  playerScores: PlayerScore[];
  onDownloadData: () => void;
  onNewSession: () => void;
}

const T = {
  bg: '#1a1a2e',
  card: '#16213e',
  border: '#0f3460',
  gold: '#e9c349',
  text: '#e0e0e0',
  muted: '#8a8a9a',
  primary: { background: '#e9c349', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 16, fontWeight: 700 as const, cursor: 'pointer' },
  tertiary: { background: 'transparent', color: '#e9c349', border: '1px solid #e9c349', borderRadius: 8, padding: '12px 28px', fontSize: 16, fontWeight: 600 as const, cursor: 'pointer' },
};

const txIcon = (p: number) => p >= 100 ? '🌳' : p >= 66 ? '🌿' : p >= 33 ? '🌱' : '⚠️';
const txColor = (p: number) => p >= 66 ? 'rgba(76,175,80,0.12)' : p >= 33 ? 'rgba(233,195,73,0.10)' : 'rgba(244,67,54,0.10)';

const rewardInfo: Record<PlayerScore['rewardLevel'], { emoji: string; label: string }> = {
  library: { emoji: '📚', label: 'Library' },
  metro: { emoji: '📚+🚇', label: 'Library + Metro' },
  certificate: { emoji: '📚+🚇+📜', label: 'Library + Metro + Certificate' },
  premium: { emoji: '📚+🚇+📜+🏆', label: 'Library + Metro + Certificate + Acknowledgment' },
};

const avatarColors = ['#e9c349', '#4fc3f7', '#ef5350', '#66bb6a', '#ab47bc', '#ff7043'];

export default function SessionComplete({ sessionNumber, rounds, playerScores, onDownloadData, onNewSession }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'sans-serif', padding: '40px 16px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Epilogue, sans-serif', fontSize: 28, color: T.gold, textAlign: 'center', margin: '0 0 32px' }}>
          Session {sessionNumber} Complete!
        </h1>

        {/* Round Summary Table */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, color: T.muted, fontSize: 12, fontWeight: 700 }}>
            <span style={{ flex: 1 }}>Round</span>
            <span style={{ width: 60, textAlign: 'center' }}>Zone</span>
            <span style={{ width: 50, textAlign: 'center' }}>Tx%</span>
            <span style={{ flex: 1, textAlign: 'center' }}>Series</span>
            <span style={{ width: 44, textAlign: 'right' }}>Pts</span>
            <span style={{ width: 70, textAlign: 'right' }}>Chain</span>
          </div>
          {rounds.map((r) => (
            <div key={r.roundNumber} style={{ padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: T.text, background: txColor(r.transformationPercent), borderBottom: `1px solid ${T.border}` }}>
              <span style={{ flex: 1 }}>R{r.roundNumber}</span>
              <span style={{ width: 60, textAlign: 'center' }}>{r.zoneName}</span>
              <span style={{ width: 50, textAlign: 'center' }}>{txIcon(r.transformationPercent)} {r.transformationPercent}%</span>
              <span style={{ flex: 1, textAlign: 'center', color: T.muted }}>{r.seriesName}</span>
              <span style={{ width: 44, textAlign: 'right', color: T.gold }}>{r.seriesPoints}</span>
              <span style={{ width: 70, textAlign: 'right', fontSize: 12, color: T.muted }}>{r.chainStatus}</span>
            </div>
          ))}
        </div>

        {/* Collaboration Points */}
        <h2 style={{ fontSize: 18, color: T.gold, margin: '0 0 16px' }}>Collaboration Points</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {playerScores.map((p, i) => {
            const isOpen = expanded === i;
            const reward = rewardInfo[p.rewardLevel];
            const aColor = avatarColors[i % avatarColors.length];
            return (
              <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: aColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#1a1a2e', flexShrink: 0 }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.text, fontSize: 15, fontWeight: 600 }}>{p.name} <span style={{ color: T.muted, fontSize: 12, fontWeight: 400 }}>({p.roleId})</span></div>
                    <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{reward.emoji} {reward.label}</div>
                  </div>
                  <div style={{ color: T.gold, fontSize: 20, fontWeight: 700 }}>{p.totalPoints}</div>
                  <span style={{ color: T.muted, fontSize: 12, marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 16px 12px 64px' }}>
                    {p.breakdown.map((b, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.text, padding: '3px 0', borderBottom: `1px solid ${T.border}` }}>
                        <span>{b.label}</span>
                        <span style={{ color: T.gold }}>{b.points}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 40 }}>
          <button onClick={onDownloadData} style={T.primary}>Download Session Data</button>
          <button onClick={onNewSession} style={T.tertiary}>Start New Session &rarr;</button>
        </div>
      </div>
    </div>
  );
}
